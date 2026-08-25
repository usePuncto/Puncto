/**
 * Fault injection — ambiente de HOMOLOGAÇÃO apenas.
 * NÃO executar contra Production.
 *
 * Uso: NODE_ENV=development npx tsx scripts/hlb-fault-injection-homolog.ts
 *
 * Simula política idêntica à Production (maxSyncAge / hardFail / 30s).
 */

import {
  HLB_MAX_SKEW_MS,
  getMaxSyncAgeMs,
  getHardFailAgeMs,
} from '../src/lib/time-clock/legal-time';

type Scenario = {
  id: string;
  description: string;
  syncAgeMs: number;
  absSkewMs: number;
  syncStatus: 'ok' | 'degraded' | 'stale' | 'failed';
  source: 'ntp_br_on' | 'cached_hlb' | 'server_fallback';
  ntpAvailable: boolean;
  expectPunch: boolean;
  expectStatus: 'ok' | 'degraded' | 'failed';
};

function evaluate(sc: Omit<Scenario, 'expectPunch' | 'expectStatus'>) {
  const maxAge = getMaxSyncAgeMs();
  const hardFail = getHardFailAgeMs();

  if (sc.source === 'server_fallback' || sc.syncStatus === 'failed') {
    return { punchAllowed: false, status: 'failed' as const };
  }
  if (sc.absSkewMs > HLB_MAX_SKEW_MS) {
    return { punchAllowed: false, status: 'failed' as const };
  }
  if (sc.syncAgeMs > hardFail) {
    return { punchAllowed: false, status: 'failed' as const };
  }
  if (sc.syncAgeMs > maxAge) {
    if (sc.ntpAvailable) return { punchAllowed: true, status: 'ok' as const };
    if (sc.syncAgeMs <= hardFail && sc.absSkewMs <= HLB_MAX_SKEW_MS) {
      return { punchAllowed: true, status: 'degraded' as const };
    }
    return { punchAllowed: false, status: 'failed' as const };
  }
  return {
    punchAllowed: true,
    status: (sc.syncStatus === 'degraded' ? 'degraded' : 'ok') as 'ok' | 'degraded',
  };
}

const scenarios: Scenario[] = [
  {
    id: 'A',
    description: 'NTP indisponível; sync recente; dentro de maxSyncAge',
    syncAgeMs: 5 * 60_000,
    absSkewMs: 2000,
    syncStatus: 'ok',
    source: 'cached_hlb',
    ntpAvailable: false,
    expectPunch: true,
    expectStatus: 'ok',
  },
  {
    id: 'B1',
    description: 'maxSyncAge ultrapassado; NTP down; ainda dentro hardFail',
    syncAgeMs: 20 * 60_000,
    absSkewMs: 2000,
    syncStatus: 'stale',
    source: 'cached_hlb',
    ntpAvailable: false,
    expectPunch: true,
    expectStatus: 'degraded',
  },
  {
    id: 'B2',
    description: 'hardFailAge ultrapassado',
    syncAgeMs: 65 * 60_000,
    absSkewMs: 2000,
    syncStatus: 'stale',
    source: 'cached_hlb',
    ntpAvailable: false,
    expectPunch: false,
    expectStatus: 'failed',
  },
  {
    id: 'C',
    description: 'offset NTP > 30s — fora de conformidade; sem tipo 4 automático',
    syncAgeMs: 60_000,
    absSkewMs: 45_000,
    syncStatus: 'degraded',
    source: 'ntp_br_on',
    ntpAvailable: true,
    expectPunch: false,
    expectStatus: 'failed',
  },
];

if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
  console.error('ABORT: fault injection não permitida em Production.');
  process.exit(1);
}

console.log('HLB fault injection — homologação (política = Production)\n');
let pass = 0;
for (const sc of scenarios) {
  const r = evaluate(sc);
  const ok = r.punchAllowed === sc.expectPunch && r.status === sc.expectStatus;
  if (ok) pass++;
  console.log(
    `[${sc.id}] ${sc.description}\n  expect punch=${sc.expectPunch} status=${sc.expectStatus}\n  got punch=${r.punchAllowed} status=${r.status} ${ok ? 'PASS' : 'FAIL'}\n`
  );
}
console.log(`${pass}/${scenarios.length} cenários OK`);
process.exit(pass === scenarios.length ? 0 : 1);

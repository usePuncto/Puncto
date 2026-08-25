/**
 * Testes controlados de degradação HLB (local, sem secrets na saída).
 * Uso: npx tsx scripts/hlb-degradation-test.ts
 */
import {
  HLB_MAX_SKEW_MS,
  getMaxSyncAgeMs,
  getHardFailAgeMs,
} from '../src/lib/time-clock/legal-time';

type Scenario = {
  name: string;
  syncAgeMs: number;
  absSkewMs: number;
  syncStatus: 'ok' | 'degraded' | 'stale' | 'failed';
  source: 'ntp_br_on' | 'cached_hlb' | 'server_fallback';
  ntpAvailable: boolean;
};

function evaluate(sc: Scenario): {
  punchAllowed: boolean;
  overall: string;
  reason: string;
} {
  const maxAge = getMaxSyncAgeMs();
  const hardFail = getHardFailAgeMs();

  if (sc.source === 'server_fallback' || sc.syncStatus === 'failed') {
    return {
      punchAllowed: false,
      overall: 'failed',
      reason: 'HLB_UNAVAILABLE — sem sincronismo utilizável',
    };
  }

  if (sc.absSkewMs > HLB_MAX_SKEW_MS) {
    return {
      punchAllowed: false,
      overall: 'failed',
      reason: `HLB_SKEW_EXCEEDED — ${sc.absSkewMs}ms > 30s`,
    };
  }

  if (sc.syncAgeMs > hardFail) {
    return {
      punchAllowed: false,
      overall: 'failed',
      reason: `HLB_SYNC_TOO_OLD — idade ${sc.syncAgeMs}ms > hardFail ${hardFail}ms`,
    };
  }

  if (sc.syncAgeMs > maxAge) {
    if (sc.ntpAvailable) {
      return {
        punchAllowed: true,
        overall: 'ok',
        reason: 'Refresh NTP bem-sucedido dentro de hardFail',
      };
    }
    if (sc.syncAgeMs <= hardFail && sc.absSkewMs <= HLB_MAX_SKEW_MS) {
      return {
        punchAllowed: true,
        overall: 'degraded',
        reason: 'Stale — NTP indisponível mas dentro de hardFail e skew OK',
      };
    }
    return {
      punchAllowed: false,
      overall: 'failed',
      reason: 'HLB_SYNC_STALE — refresh falhou',
    };
  }

  return {
    punchAllowed: true,
    overall: sc.syncStatus === 'degraded' ? 'degraded' : 'ok',
    reason: 'Dentro de maxSyncAge e tolerância legal',
  };
}

const scenarios: Scenario[] = [
  {
    name: 'A — sync recente, NTP indisponível momentaneamente',
    syncAgeMs: 5 * 60_000,
    absSkewMs: 2000,
    syncStatus: 'ok',
    source: 'cached_hlb',
    ntpAvailable: false,
  },
  {
    name: 'B — maxSyncAge ultrapassado, hardFail não',
    syncAgeMs: 20 * 60_000,
    absSkewMs: 2000,
    syncStatus: 'stale',
    source: 'cached_hlb',
    ntpAvailable: false,
  },
  {
    name: 'B2 — hardFail ultrapassado',
    syncAgeMs: 65 * 60_000,
    absSkewMs: 2000,
    syncStatus: 'stale',
    source: 'cached_hlb',
    ntpAvailable: false,
  },
  {
    name: 'C — offset NTP > 30s',
    syncAgeMs: 60_000,
    absSkewMs: 45_000,
    syncStatus: 'degraded',
    source: 'ntp_br_on',
    ntpAvailable: true,
  },
];

console.log('HLB degradation policy test\n');
console.log(`maxSyncAge=${getMaxSyncAgeMs()}ms hardFail=${getHardFailAgeMs()}ms legalMaxSkew=${HLB_MAX_SKEW_MS}ms\n`);

for (const sc of scenarios) {
  const r = evaluate(sc);
  console.log(`[${sc.name}]`);
  console.log(`  punchAllowed=${r.punchAllowed} status=${r.overall}`);
  console.log(`  ${r.reason}\n`);
}

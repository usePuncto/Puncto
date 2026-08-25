/**
 * Hora Legal Brasileira (HLB) — sincronismo via NTP.br / Observatório Nacional.
 *
 * Política (não confundir):
 * - 30s = variação máxima admitida vs HLB (Portaria 671), NÃO gatilho de AFD tipo 4.
 * - Tipo 4 = ajuste efetivo do relógio lógico do REP-P (ver applyLogicalClockAdjust).
 * - Batida NÃO exige NTP a cada POST; exige sincronismo comprovado dentro da tolerância.
 *
 * Fontes primárias (césio / HLB): [a,c,d,e].st1.ntp.br e stratum-2 a/b/c.ntp.br
 * (lista oficial https://ntp.br/ — sem gps.* como primária; b.st1 não consta na tabela atual).
 * Override sem deploy: PUNCTO_NTP_HOSTS=host1,host2,...
 *
 * @see https://ntp.br/
 */

import dgram from 'dgram';
import { createHash } from 'crypto';
import { db } from '@/lib/firebaseAdmin';

/** Portaria 671 — desvio máximo admitido vs HLB */
export const HLB_MAX_SKEW_MS = 30_000;

/**
 * Idade máxima do último sync bem-sucedido para ainda aceitar batida
 * sem nova consulta NTP (relógio ainda considerado sincronizado).
 * Default 15 min — configurável: PUNCTO_HLB_MAX_SYNC_AGE_MS
 */
export function getMaxSyncAgeMs(): number {
  const n = Number(process.env.PUNCTO_HLB_MAX_SYNC_AGE_MS);
  return Number.isFinite(n) && n > 0 ? n : 15 * 60_000;
}

/**
 * Além deste prazo sem sync bem-sucedido, batida é recusada
 * (não é mais possível assegurar confiabilidade).
 * Default 60 min — PUNCTO_HLB_HARD_FAIL_AGE_MS
 */
export function getHardFailAgeMs(): number {
  const n = Number(process.env.PUNCTO_HLB_HARD_FAIL_AGE_MS);
  return Number.isFinite(n) && n > 0 ? n : 60 * 60_000;
}

/** Intervalo desejado de re-sync em background (não por batida). Default 60s */
export function getSyncIntervalMs(): number {
  const n = Number(process.env.PUNCTO_HLB_SYNC_INTERVAL_MS);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

/**
 * Hosts oficiais NTP.br vinculados à HLB (césio / stratum-2 derivado).
 * Sem gps.* (GNSS) como fonte primária.
 * b.st1.ntp.br omitido — não aparece na tabela pública atual do ntp.br.
 */
export const DEFAULT_NTP_BR_HLB_HOSTS = [
  'a.st1.ntp.br',
  'c.st1.ntp.br',
  'd.st1.ntp.br',
  'e.st1.ntp.br',
  'a.ntp.br',
  'b.ntp.br',
  'c.ntp.br',
] as const;

export function getNtpHosts(): string[] {
  const raw = process.env.PUNCTO_NTP_HOSTS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
      .filter((h) => !h.toLowerCase().startsWith('gps.'));
  }
  return [...DEFAULT_NTP_BR_HLB_HOSTS];
}

const NTP_TIMEOUT_MS = 2500;
const NTP_PORT = 123;
const HLB_STATE_DOC = db.collection('system').doc('repPHlbSync');

export type TimeSource = 'ntp_br_on' | 'cached_hlb' | 'server_fallback';
export type SyncStatus = 'ok' | 'degraded' | 'failed' | 'stale';

export type HlbSyncState = {
  lastSuccessfulHlbSync: string;
  measuredOffsetMs: number;
  source: string;
  ntpServer: string | null;
  syncStatus: SyncStatus;
  absSkewMs: number;
  updatedAt: string;
};

export type LegalTimeResult = {
  date: Date;
  iso: string;
  unixMs: number;
  source: TimeSource;
  ntpServer?: string;
  offsetMs: number;
  syncedAt: string;
  absSkewMs: number;
  within30sLimit: boolean;
  syncStatus: SyncStatus;
  syncAgeMs: number;
  hlbTraceability: string;
  hostsConfigured: string[];
};

type MemoryCache = {
  offsetMs: number;
  source: TimeSource;
  ntpServer?: string;
  syncedAtMs: number;
  absSkewAtSync: number;
  syncStatus: SyncStatus;
};

let memory: MemoryCache | null = null;
let syncInFlight: Promise<MemoryCache> | null = null;

function parseNtpTimestamp(buffer: Buffer, offset: number): number {
  const seconds = buffer.readUInt32BE(offset);
  const fraction = buffer.readUInt32BE(offset + 4);
  return (seconds - 2208988800) * 1000 + Math.floor((fraction * 1000) / 0x100000000);
}

export async function queryNtpServer(
  host: string
): Promise<{ offsetMs: number; serverTimeMs: number; rttMs: number }> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const packet = Buffer.alloc(48);
    packet[0] = 0x1b;
    const t0 = Date.now();
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`NTP timeout: ${host}`));
    }, NTP_TIMEOUT_MS);

    socket.on('message', (msg) => {
      clearTimeout(timer);
      const t3 = Date.now();
      try {
        if (msg.length < 48) throw new Error('Invalid NTP packet');
        const serverTimeMs = parseNtpTimestamp(msg, 40);
        const rttMs = t3 - t0;
        const offsetMs = serverTimeMs - (t0 + rttMs / 2);
        socket.close();
        resolve({ offsetMs, serverTimeMs, rttMs });
      } catch (err) {
        socket.close();
        reject(err);
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      reject(err);
    });

    socket.send(packet, NTP_PORT, host);
  });
}

async function persistSyncState(state: HlbSyncState): Promise<void> {
  try {
    await HLB_STATE_DOC.set({ ...state, updatedAtMs: Date.now() }, { merge: true });
  } catch (e) {
    console.warn('[HLB] failed to persist sync state:', e);
  }
}

async function loadPersistedSyncState(): Promise<MemoryCache | null> {
  try {
    const snap = await HLB_STATE_DOC.get();
    if (!snap.exists) return null;
    const d = snap.data()!;
    const syncedAtMs =
      typeof d.updatedAtMs === 'number'
        ? d.updatedAtMs
        : d.lastSuccessfulHlbSync
          ? new Date(d.lastSuccessfulHlbSync).getTime()
          : 0;
    if (!syncedAtMs) return null;
    return {
      offsetMs: Number(d.measuredOffsetMs || 0),
      source: 'cached_hlb',
      ntpServer: d.ntpServer || undefined,
      syncedAtMs,
      absSkewAtSync: Number(d.absSkewMs || 0),
      syncStatus: (d.syncStatus as SyncStatus) || 'ok',
    };
  } catch {
    return null;
  }
}

/** Probe all configured hosts (for /hlb/probe and ops). */
export async function probeNtpHosts(): Promise<{
  hosts: string[];
  results: Array<{
    host: string;
    ok: boolean;
    offsetMs?: number;
    rttMs?: number;
    error?: string;
  }>;
  anyOk: boolean;
  runtimeNote: string;
}> {
  const hosts = getNtpHosts();
  const results: Array<{
    host: string;
    ok: boolean;
    offsetMs?: number;
    rttMs?: number;
    error?: string;
  }> = [];

  for (const host of hosts) {
    try {
      const r = await queryNtpServer(host);
      results.push({ host, ok: true, offsetMs: r.offsetMs, rttMs: r.rttMs });
    } catch (e) {
      results.push({
        host,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    hosts,
    results,
    anyOk: results.some((r) => r.ok),
    runtimeNote:
      'UDP/123 deve estar liberado no runtime. Em alguns ambientes serverless (ex.: Vercel) UDP outbound pode falhar — nesse caso use sync periódico em runtime com UDP (ex.: Cloud Functions) gravando system/repPHlbSync.',
  };
}

/**
 * Force a sync attempt against NTP.br and update memory + Firestore state.
 * Prefer calling from scheduler — not on every punch.
 */
export async function syncHlbFromNtp(): Promise<MemoryCache> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const hosts = getNtpHosts();
    for (const host of hosts) {
      try {
        const { offsetMs } = await queryNtpServer(host);
        const absSkewAtSync = Math.abs(offsetMs);
        const next: MemoryCache = {
          offsetMs,
          source: 'ntp_br_on',
          ntpServer: host,
          syncedAtMs: Date.now(),
          absSkewAtSync,
          syncStatus: absSkewAtSync <= HLB_MAX_SKEW_MS ? 'ok' : 'degraded',
        };
        memory = next;
        await persistSyncState({
          lastSuccessfulHlbSync: new Date(next.syncedAtMs).toISOString(),
          measuredOffsetMs: offsetMs,
          source: host,
          ntpServer: host,
          syncStatus: next.syncStatus,
          absSkewMs: absSkewAtSync,
          updatedAt: new Date().toISOString(),
        });
        return next;
      } catch (err) {
        console.warn(`[HLB] NTP fail ${host}:`, err instanceof Error ? err.message : err);
      }
    }

    const failed: MemoryCache = {
      offsetMs: memory?.offsetMs ?? 0,
      source: memory ? 'cached_hlb' : 'server_fallback',
      ntpServer: memory?.ntpServer,
      syncedAtMs: memory?.syncedAtMs ?? Date.now(),
      absSkewAtSync: memory?.absSkewAtSync ?? 0,
      syncStatus: memory ? 'stale' : 'failed',
    };
    if (!memory) {
      console.error('[HLB] Nenhum host NTP.br respondeu e não há sync prévio em cache.');
    }
    return failed;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

function toLegalResult(cache: MemoryCache): LegalTimeResult {
  const nowLocal = Date.now();
  const syncAgeMs = nowLocal - cache.syncedAtMs;
  const unixMs = nowLocal + cache.offsetMs;
  const date = new Date(unixMs);
  const within30s =
    (cache.source === 'ntp_br_on' || cache.source === 'cached_hlb') &&
    cache.absSkewAtSync <= HLB_MAX_SKEW_MS &&
    cache.syncStatus !== 'failed';

  return {
    date,
    iso: date.toISOString(),
    unixMs,
    source: cache.source,
    ntpServer: cache.ntpServer,
    offsetMs: cache.offsetMs,
    syncedAt: new Date(cache.syncedAtMs).toISOString(),
    absSkewMs: cache.absSkewAtSync,
    within30sLimit: within30s,
    syncStatus: cache.syncStatus,
    syncAgeMs,
    hostsConfigured: getNtpHosts(),
    hlbTraceability:
      cache.source === 'server_fallback' || cache.syncStatus === 'failed'
        ? 'INDISPONÍVEL — sem sincronismo NTP.br confiável'
        : `HLB via NTP.br (${cache.ntpServer || 'cache'}); última sync ${new Date(cache.syncedAtMs).toISOString()}; idade ${syncAgeMs}ms`,
  };
}

/**
 * Obtém hora legal a partir do relógio lógico já sincronizado.
 * Re-sync NTP só se o cache local/persistido estiver velho (> sync interval).
 */
export async function getBrazilianLegalTime(): Promise<LegalTimeResult> {
  const now = Date.now();
  const interval = getSyncIntervalMs();

  if (memory && now - memory.syncedAtMs < interval && memory.syncStatus !== 'failed') {
    return toLegalResult(memory);
  }

  // Try persisted state (cross-instance / CF sync) before hammering NTP
  if (!memory || now - memory.syncedAtMs >= interval) {
    const persisted = await loadPersistedSyncState();
    if (persisted && now - persisted.syncedAtMs < getMaxSyncAgeMs()) {
      memory = persisted;
      if (now - persisted.syncedAtMs < interval) {
        return toLegalResult(persisted);
      }
    }
  }

  // Background-style sync (awaited here if no usable cache)
  if (!memory || now - memory.syncedAtMs >= interval) {
    const synced = await syncHlbFromNtp();
    if (synced.syncStatus === 'ok' || synced.syncStatus === 'degraded') {
      return toLegalResult(synced);
    }
    if (memory && now - memory.syncedAtMs < getHardFailAgeMs()) {
      memory = { ...memory, syncStatus: 'stale' };
      return toLegalResult(memory);
    }
    return toLegalResult(synced);
  }

  return toLegalResult(memory);
}

export type HlbGuardResult =
  | { ok: true; legal: LegalTimeResult }
  | { ok: false; legal: LegalTimeResult; code: string; message: string };

/**
 * Aceita batida se ainda for possível assegurar HLB dentro da tolerância:
 * - último sync bem-sucedido com |skew| ≤ 30s
 * - idade do sync ≤ maxSyncAge (preferencial) ou ≤ hardFailAge (limite)
 * NÃO exige NTP round-trip nesta chamada.
 */
export async function assertHlbReadyForMark(): Promise<HlbGuardResult> {
  const legal = await getBrazilianLegalTime();
  const maxAge = getMaxSyncAgeMs();
  const hardFail = getHardFailAgeMs();

  if (legal.syncStatus === 'failed' || legal.source === 'server_fallback') {
    return {
      ok: false,
      legal,
      code: 'HLB_UNAVAILABLE',
      message:
        'Hora Legal Brasileira indisponível. Não há sincronismo NTP.br utilizável para o REP-P.',
    };
  }

  if (legal.absSkewMs > HLB_MAX_SKEW_MS) {
    return {
      ok: false,
      legal,
      code: 'HLB_SKEW_EXCEEDED',
      message: `Desvio medido na última sync (${legal.absSkewMs}ms) excede o limite legal de 30s vs HLB.`,
    };
  }

  if (legal.syncAgeMs > hardFail) {
    return {
      ok: false,
      legal,
      code: 'HLB_SYNC_TOO_OLD',
      message: `Último sincronismo HLB tem ${legal.syncAgeMs}ms (limite hard ${hardFail}ms). Não é possível assegurar a tolerância legal.`,
    };
  }

  if (legal.syncAgeMs > maxAge) {
    // Still within hard fail — try one refresh; if fails but previous was ok, degrade message
    const refreshed = await syncHlbFromNtp();
    const again = toLegalResult(
      refreshed.syncStatus === 'ok' || refreshed.syncStatus === 'degraded'
        ? refreshed
        : memory || refreshed
    );
    if (
      again.syncStatus !== 'failed' &&
      again.absSkewMs <= HLB_MAX_SKEW_MS &&
      again.syncAgeMs <= hardFail
    ) {
      return { ok: true, legal: again };
    }
    if (legal.syncAgeMs <= hardFail && legal.within30sLimit) {
      // Policy: allow within hard-fail window with documented degraded status
      return {
        ok: true,
        legal: { ...legal, syncStatus: 'stale' },
      };
    }
    return {
      ok: false,
      legal: again,
      code: 'HLB_SYNC_STALE',
      message: `Sincronismo HLB stale (${legal.syncAgeMs}ms > maxSyncAge ${maxAge}ms) e refresh falhou.`,
    };
  }

  return { ok: true, legal };
}

/**
 * @deprecated Tipo 4 NÃO deve ser emitido por mera detecção de desvio ≥30s.
 * Mantido só para não quebrar imports; sempre retorna false.
 */
export function shouldEmitClockAdjust(
  _previousOffsetMs: number | null,
  _currentOffsetMs: number
): boolean {
  return false;
}

export function formatLegalDateTimeBr(date: Date): { date: string; time: string; tz: string } {
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.day}/${parts.month}/${parts.year}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    tz: 'America/Sao_Paulo',
  };
}

export function sha256Hex(payload: string | Buffer): string {
  return createHash('sha256').update(payload).digest('hex');
}

export function buildMarkIntegrityPayload(input: {
  businessId: string;
  userId: string;
  type: string;
  nsr: number;
  timestampIso: string;
}): string {
  return [
    input.businessId,
    input.userId,
    input.type,
    String(input.nsr),
    input.timestampIso,
  ].join('|');
}

export const RETENTION_YEARS = 5;

export function retentionUntilFrom(date: Date): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + RETENTION_YEARS);
  return d;
}

/**
 * Documentação da política — espelhada em HLB_POLICY.md
 */
export const HLB_POLICY = {
  legalMaxSkewMs: HLB_MAX_SKEW_MS,
  maxSyncAgeMsDefault: 15 * 60_000,
  hardFailAgeMsDefault: 60 * 60_000,
  syncIntervalMsDefault: 60_000,
  primaryHosts: DEFAULT_NTP_BR_HLB_HOSTS,
  gpsHostsNotPrimary: true,
  type4NotTiedTo30sSkew: true,
  note: '30s = tolerância legal vs HLB. Tipo 4 AFD = ajuste efetivo do relógio, não detecção de desvio.',
} as const;

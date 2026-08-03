/**
 * Brazilian Legal Time (Hora Legal Brasileira) via NTP.br / Observatório Nacional.
 * Mark timestamps MUST come from here — never from the employee device.
 *
 * Primary servers: NTP.br stratum-1 hosts operated with Observatório Nacional reference.
 * @see https://ntp.br/
 */

import dgram from 'dgram';
import { createHash } from 'crypto';

const NTP_SERVERS = [
  'a.st1.ntp.br',
  'b.st1.ntp.br',
  'c.st1.ntp.br',
  'd.st1.ntp.br',
] as const;

const NTP_TIMEOUT_MS = 2500;
const NTP_PORT = 123;
/** Re-sync at most every 60s in the same process */
const CACHE_TTL_MS = 60_000;

export type TimeSource = 'ntp_br_on' | 'server_fallback';

export type LegalTimeResult = {
  date: Date;
  iso: string;
  unixMs: number;
  source: TimeSource;
  ntpServer?: string;
  offsetMs: number;
  syncedAt: string;
};

type Cache = {
  offsetMs: number;
  source: TimeSource;
  ntpServer?: string;
  syncedAtMs: number;
};

let cache: Cache | null = null;

function parseNtpTimestamp(buffer: Buffer, offset: number): number {
  const seconds = buffer.readUInt32BE(offset);
  const fraction = buffer.readUInt32BE(offset + 4);
  // NTP epoch → Unix epoch
  return (seconds - 2208988800) * 1000 + Math.floor((fraction * 1000) / 0x100000000);
}

async function queryNtpServer(host: string): Promise<{ offsetMs: number; serverTimeMs: number }> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const packet = Buffer.alloc(48);
    packet[0] = 0x1b; // LI=0, VN=3, Mode=3 (client)

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
        // Simplified offset: server - local mid-RTT approximation
        const rtt = t3 - t0;
        const offsetMs = serverTimeMs - (t0 + rtt / 2);
        socket.close();
        resolve({ offsetMs, serverTimeMs });
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

async function syncOffset(): Promise<Cache> {
  for (const host of NTP_SERVERS) {
    try {
      const { offsetMs } = await queryNtpServer(host);
      const next: Cache = {
        offsetMs,
        source: 'ntp_br_on',
        ntpServer: host,
        syncedAtMs: Date.now(),
      };
      cache = next;
      return next;
    } catch (err) {
      console.warn(`[HLB] NTP sync failed for ${host}:`, err instanceof Error ? err.message : err);
    }
  }

  const fallback: Cache = {
    offsetMs: 0,
    source: 'server_fallback',
    syncedAtMs: Date.now(),
  };
  cache = fallback;
  console.error(
    '[HLB] All NTP.br servers unreachable — using host clock. Ensure production hosts sync via NTP to Hora Legal Brasileira (Observatório Nacional / NTP.br).'
  );
  return fallback;
}

/**
 * Returns current Hora Legal Brasileira estimate.
 * Never trust client-provided clocks for official marks.
 */
export async function getBrazilianLegalTime(): Promise<LegalTimeResult> {
  const nowLocal = Date.now();
  const fresh =
    cache && nowLocal - cache.syncedAtMs < CACHE_TTL_MS ? cache : await syncOffset();

  const unixMs = nowLocal + fresh.offsetMs;
  const date = new Date(unixMs);

  return {
    date,
    iso: date.toISOString(),
    unixMs,
    source: fresh.source,
    ntpServer: fresh.ntpServer,
    offsetMs: fresh.offsetMs,
    syncedAt: new Date(fresh.syncedAtMs).toISOString(),
  };
}

/** Format for AFD/comprovante in America/Sao_Paulo */
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

/** Canonical payload hashed into each immutable mark (AFD integrity) */
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

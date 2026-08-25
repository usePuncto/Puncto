/**
 * Sync HLB via NTP.br inside Cloud Functions (UDP/123 available).
 * Writes system/repPHlbSync for Next.js/Vercel to consume without per-punch NTP.
 *
 * Hosts: lista oficial https://ntp.br/ (sem gps.* como primária).
 * Override: PUNCTO_NTP_HOSTS=host1,host2
 */

import * as dgram from 'dgram';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp();
}

const HLB_MAX_SKEW_MS = 30_000;
const NTP_TIMEOUT_MS = 2500;
const NTP_PORT = 123;

/** Alinhado à tabela pública atual do ntp.br (sem b.st1; sem gps.*) */
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

function parseNtpTimestamp(buffer: Buffer, offset: number): number {
  const seconds = buffer.readUInt32BE(offset);
  const fraction = buffer.readUInt32BE(offset + 4);
  return (seconds - 2208988800) * 1000 + Math.floor((fraction * 1000) / 0x100000000);
}

export function queryNtpServer(
  host: string
): Promise<{ offsetMs: number; rttMs: number }> {
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
        resolve({ offsetMs, rttMs });
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

export type HlbProbeResult = {
  host: string;
  ok: boolean;
  offsetMs?: number;
  rttMs?: number;
  error?: string;
};

export async function probeAndSyncHlb(): Promise<{
  hosts: string[];
  results: HlbProbeResult[];
  anyOk: boolean;
  persisted: boolean;
  syncStatus: 'ok' | 'degraded' | 'failed';
  ntpServer: string | null;
  measuredOffsetMs: number | null;
}> {
  const hosts = getNtpHosts();
  const results: HlbProbeResult[] = [];
  let chosen: { host: string; offsetMs: number } | null = null;

  for (const host of hosts) {
    try {
      const { offsetMs, rttMs } = await queryNtpServer(host);
      results.push({ host, ok: true, offsetMs, rttMs });
      if (!chosen) chosen = { host, offsetMs };
    } catch (e) {
      results.push({
        host,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!chosen) {
    return {
      hosts,
      results,
      anyOk: false,
      persisted: false,
      syncStatus: 'failed',
      ntpServer: null,
      measuredOffsetMs: null,
    };
  }

  const absSkewMs = Math.abs(chosen.offsetMs);
  const syncStatus: 'ok' | 'degraded' = absSkewMs <= HLB_MAX_SKEW_MS ? 'ok' : 'degraded';
  const now = new Date();
  const db = getFirestore();
  await db.collection('system').doc('repPHlbSync').set(
    {
      lastSuccessfulHlbSync: now.toISOString(),
      measuredOffsetMs: chosen.offsetMs,
      source: chosen.host,
      ntpServer: chosen.host,
      syncStatus,
      absSkewMs,
      updatedAt: now.toISOString(),
      updatedAtMs: now.getTime(),
      syncedBy: 'cloud_function_syncRepPHlb',
    },
    { merge: true }
  );

  return {
    hosts,
    results,
    anyOk: true,
    persisted: true,
    syncStatus,
    ntpServer: chosen.host,
    measuredOffsetMs: chosen.offsetMs,
  };
}

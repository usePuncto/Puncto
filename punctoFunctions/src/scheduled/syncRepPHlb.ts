/**
 * Periodic HLB sync via NTP.br — runs IN Cloud Functions (UDP/123),
 * independent of punch traffic and of Vercel UDP restrictions.
 * Persists system/repPHlbSync for the Next.js runtime to read.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { probeAndSyncHlb } from '../lib/hlbNtpSync';

export const syncRepPHlb = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
    timeoutSeconds: 120,
    retryCount: 3,
    memory: '256MiB',
  },
  async () => {
    const result = await probeAndSyncHlb();
    console.log('[syncRepPHlb]', {
      anyOk: result.anyOk,
      syncStatus: result.syncStatus,
      ntpServer: result.ntpServer,
      measuredOffsetMs: result.measuredOffsetMs,
      okHosts: result.results.filter((r) => r.ok).map((r) => r.host),
    });
    if (!result.anyOk) {
      throw new Error('HLB NTP sync failed — no NTP.br host responded');
    }
  }
);

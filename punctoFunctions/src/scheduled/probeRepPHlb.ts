/**
 * HTTP probe de NTP.br em runtime de produção (Cloud Functions).
 * Consulta UDP/123 diretamente e persiste system/repPHlbSync.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { probeAndSyncHlb } from '../lib/hlbNtpSync';

export const probeRepPHlb = onRequest(
  {
    region: 'southamerica-east1',
    cors: false,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    const secret = req.header('x-rep-p-monitor-secret');
    const expected = process.env.REP_P_MONITOR_SECRET;
    if (!expected || secret !== expected) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const result = await probeAndSyncHlb();
      const valid = result.results.filter((r) => r.ok);
      const primary = valid[0];
      const withinLegalTolerance =
        result.anyOk &&
        result.measuredOffsetMs !== null &&
        Math.abs(result.measuredOffsetMs) <= 30_000;

      const body = {
        status: !result.anyOk
          ? 'failed'
          : result.syncStatus === 'degraded' || !withinLegalTolerance
            ? 'degraded'
            : 'ok',
        syncStatus: result.syncStatus,
        lastSuccessfulHlbSync: result.anyOk ? new Date().toISOString() : null,
        syncAgeSeconds: 0,
        measuredOffsetMs: result.measuredOffsetMs,
        withinLegalTolerance,
        sourceCount: result.results.length,
        validSourceCount: valid.length,
        ntpServer: result.ntpServer,
        runtime: {
          platform: 'cloud_functions',
          region: 'southamerica-east1',
          nodeVersion: process.version,
        },
        probeSummary: {
          consulted: result.results.length,
          valid: valid.length,
          primaryHost: primary?.host ?? null,
          sampleOffsetMs: primary?.offsetMs ?? null,
          sampleRttMs: primary?.rttMs ?? null,
          results: result.results.map((r) => ({
            host: r.host,
            ok: r.ok,
            offsetMs: r.offsetMs ?? null,
            rttMs: r.rttMs ?? null,
            error: r.error ?? null,
          })),
        },
        persisted: result.persisted,
        persistTarget: 'firestore/system/repPHlbSync',
      };

      res.status(result.anyOk ? 200 : 503).json(body);
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
);

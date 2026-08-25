import { NextRequest, NextResponse } from 'next/server';
import {
  getNtpHosts,
  probeNtpHosts,
  getBrazilianLegalTime,
  HLB_MAX_SKEW_MS,
  type SyncStatus,
} from '@/lib/time-clock/legal-time';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorizeProbe(request: NextRequest): boolean {
  const secret = request.headers.get('x-rep-p-monitor-secret');
  const expected = process.env.REP_P_MONITOR_SECRET;
  if (!expected) return false;
  return Boolean(secret && secret === expected);
}

function mapOverallStatus(
  syncStatus: SyncStatus,
  withinLegalTolerance: boolean,
  ntpReachable: boolean
): 'ok' | 'degraded' | 'failed' {
  if (syncStatus === 'failed' || !withinLegalTolerance) return 'failed';
  if (syncStatus === 'stale' || syncStatus === 'degraded' || !ntpReachable) return 'degraded';
  return 'ok';
}

/**
 * GET /api/time-clock/hlb/probe
 * Diagnóstico HLB no runtime Vercel. Produção exige x-rep-p-monitor-secret.
 * NTP primário roda em Cloud Function syncRepPHlb; este endpoint lê estado + opcional probe UDP local.
 */
export async function GET(request: NextRequest) {
  if (!authorizeProbe(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const probe = await probeNtpHosts();
  const legal = await getBrazilianLegalTime();
  const validSources = probe.results.filter((r) => r.ok).length;
  const withinLegalTolerance =
    legal.within30sLimit &&
    legal.syncStatus !== 'failed' &&
    legal.source !== 'server_fallback';

  const status = mapOverallStatus(
    legal.syncStatus,
    withinLegalTolerance,
    probe.anyOk
  );

  return NextResponse.json({
    status,
    syncStatus: legal.syncStatus,
    lastSuccessfulHlbSync: legal.syncedAt,
    syncAgeSeconds: Math.round(legal.syncAgeMs / 1000),
    measuredOffsetMs: legal.offsetMs,
    withinLegalTolerance,
    sourceCount: probe.results.length,
    validSourceCount: validSources,
    ntpServer: legal.ntpServer || null,
    hostsConfigured: getNtpHosts().length,
    runtime: {
      platform: 'vercel',
      nodeEnv: process.env.NODE_ENV,
      region: process.env.VERCEL_REGION || null,
      vercelUdpProbeOk: probe.anyOk,
    },
    probeSummary: {
      consulted: probe.results.length,
      valid: validSources,
      primaryHost: probe.results.find((r) => r.ok)?.host || null,
      sampleOffsetMs: probe.results.find((r) => r.ok)?.offsetMs ?? null,
      sampleRttMs: probe.results.find((r) => r.ok)?.rttMs ?? null,
    },
    note:
      'Sincronismo HLB periódico é mantido por Cloud Function syncRepPHlb (UDP nativo → system/repPHlbSync).',
  });
}

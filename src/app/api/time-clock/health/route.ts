import { NextRequest, NextResponse } from 'next/server';
import { requireTimeClockAuth, canManageTimeClock } from '@/lib/time-clock/auth';
import { applyAvailabilityProbe, checkRepPHealth } from '@/lib/time-clock/health';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/health?businessId=
 * Diagnostic probe. Does NOT write ARP transitions by default.
 *
 * Scheduler should call with writeTransitions=1 (or use Cloud Function directly).
 * Availability monitoring must not depend solely on humans opening this page.
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    const writeTransitions =
      request.nextUrl.searchParams.get('writeTransitions') === '1';

    if (!businessId) {
      return NextResponse.json(await checkRepPHealth());
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor) && !writeTransitions) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Scheduler auth: platform admin or secret header
    if (writeTransitions) {
      const cronSecret = request.headers.get('x-rep-p-monitor-secret');
      const expected = process.env.REP_P_MONITOR_SECRET;
      const allowed =
        authResult.actor.isPlatformAdmin ||
        (expected && cronSecret && cronSecret === expected);
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden for writeTransitions' }, { status: 403 });
      }
    }

    const report = await applyAvailabilityProbe({
      businessId,
      business: authResult.business,
      writeTransitions,
      createdBy: writeTransitions ? 'system:http-monitor' : 'diagnostic',
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('[time-clock health]', error);
    return NextResponse.json(
      {
        available: false,
        error: error instanceof Error ? error.message : 'health_failed',
      },
      { status: 503 }
    );
  }
}

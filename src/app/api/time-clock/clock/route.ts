import { NextRequest, NextResponse } from 'next/server';
import { ClockInType } from '@/types/timeClock';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';
import { registerImmutableMark } from '@/lib/time-clock/register-mark';

/**
 * POST /api/time-clock/clock
 *
 * Compliance (Portaria 671 / REP-P):
 * - Official time from HLB (NTP.br), never device clock
 * - Mark always accepted (no time-of-day lock, no overtime pre-approval)
 * - Original mark is immutable (AFD); shifts are best-effort UX only
 * - Generates digital comprovante PDF immediately (≤48h availability)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      type,
      location,
      deviceId,
      notes,
      userId: bodyUserId,
      clientReportedAt,
    } = body as {
      businessId?: string;
      type?: ClockInType;
      location?: { lat: number; lng: number };
      deviceId?: string;
      notes?: string;
      userId?: string;
      /** Ignored for official time — audit only */
      clientReportedAt?: string;
    };

    if (!businessId || !type) {
      return NextResponse.json(
        { error: 'businessId and type are required' },
        { status: 400 }
      );
    }

    const validTypes: ClockInType[] = ['in', 'out', 'break_start', 'break_end'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid clock type' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const { actor, business } = authResult;

    const targetUserId =
      bodyUserId && canManageTimeClock(actor) ? bodyUserId : actor.uid;

    if (targetUserId !== actor.uid && !canManageTimeClock(actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await registerImmutableMark({
      business,
      businessId,
      userId: targetUserId,
      type,
      actorUid: actor.uid,
      location,
      deviceId,
      ipAddress:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        undefined,
      notes,
      clientReportedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[time-clock clock POST] Error:', error);
    return NextResponse.json({ error: 'Failed to clock in/out' }, { status: 500 });
  }
}

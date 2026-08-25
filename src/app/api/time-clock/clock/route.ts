import { NextRequest, NextResponse } from 'next/server';
import { ClockInType } from '@/types/timeClock';
import { requireTimeClockAuth } from '@/lib/time-clock/auth';
import { registerImmutableMark } from '@/lib/time-clock/register-mark';

/**
 * POST /api/time-clock/clock
 *
 * Compliance (Portaria 671 / REP-P):
 * - Official time from HLB (NTP.br), never device clock
 * - Mark always attributed to authenticated Firebase uid (no proxy punch)
 * - Original mark is immutable (ARP/AFD); corrections via PTRP adjustments only
 * - CPF + repPReady required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      type,
      location,
      locationPurpose,
      deviceId,
      notes,
      clientReportedAt,
      userId: _ignoredUserId,
      employeeId: _ignoredEmployeeId,
    } = body as {
      businessId?: string;
      type?: ClockInType;
      location?: { lat: number; lng: number };
      locationPurpose?: string;
      deviceId?: string;
      notes?: string;
      clientReportedAt?: string;
      userId?: string;
      employeeId?: string;
    };

    // Explicitly reject impersonation attempts
    if (_ignoredUserId || _ignoredEmployeeId) {
      return NextResponse.json(
        {
          error:
            'Não é permitido informar userId/employeeId na batida. A marcação REP-P pertence exclusivamente ao usuário autenticado. Use o módulo de tratamento (PTRP) para inclusões manuais.',
        },
        { status: 400 }
      );
    }

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

    const result = await registerImmutableMark({
      business,
      businessId,
      userId: actor.uid,
      type,
      actorUid: actor.uid,
      location,
      locationPurpose,
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
    const message = error instanceof Error ? error.message : 'Failed to clock in/out';
    const code = (error as { code?: string })?.code;
    console.error('[time-clock clock POST] Error:', error);
    const status = code === 'REP_P_NOT_READY' ? 403 : 500;
    return NextResponse.json(
      { error: message, code: code || 'CLOCK_ERROR' },
      { status }
    );
  }
}

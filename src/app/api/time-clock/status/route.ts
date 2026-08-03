import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  requireTimeClockAuth,
  serializeTimestamp,
} from '@/lib/time-clock/auth';
import { calculateShiftHours } from '@/lib/time-clock/calculations';
import { getBrazilianLegalTime } from '@/lib/time-clock/legal-time';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/status?businessId=
 * Punch UI status. All mark types remain available (no time locks / no overtime unlock).
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const { actor } = authResult;
    const shiftsRef = db.collection('businesses').doc(businessId).collection('shifts');
    const clockInsRef = db.collection('businesses').doc(businessId).collection('clockIns');

    const [activeSnap, legal] = await Promise.all([
      shiftsRef
        .where('userId', '==', actor.uid)
        .where('status', '==', 'active')
        .limit(1)
        .get(),
      getBrazilianLegalTime(),
    ]);

    let activeShift = null;
    if (!activeSnap.empty) {
      const doc = activeSnap.docs[0];
      const data = doc.data();
      const shift = {
        id: doc.id,
        userId: data.userId,
        startTime: serializeTimestamp(data.startTime),
        breakDuration: data.breakDuration || 0,
        breakStartedAt: serializeTimestamp(data.breakStartedAt),
        status: data.status,
        totalHours: undefined as number | undefined,
      };
      shift.totalHours = calculateShiftHours({
        id: doc.id,
        businessId,
        userId: data.userId,
        startTime: data.startTime,
        breakDuration: data.breakDuration || 0,
        status: 'active',
        clockIns: data.clockIns || [],
        createdAt: data.createdAt || data.startTime,
      });
      activeShift = shift;
    }

    let lastClockIn = null;
    try {
      const lastSnap = await clockInsRef
        .where('userId', '==', actor.uid)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      if (!lastSnap.empty) {
        const data = lastSnap.docs[0].data();
        lastClockIn = {
          id: lastSnap.docs[0].id,
          type: data.type,
          timestamp: serializeTimestamp(data.timestamp),
          nsr: data.nsr ?? null,
          receiptStatus: data.receiptStatus ?? null,
        };
      }
    } catch {
      // ignore index issues
    }

    const onBreak = Boolean(activeShift?.breakStartedAt);

    /** Suggested UX only — never blocks other actions */
    const suggestedActions = !activeShift
      ? (['in'] as const)
      : onBreak
        ? (['break_end'] as const)
        : (['break_start', 'out'] as const);

    /** Portaria 671: cannot lock punch button by schedule / overtime approval */
    const availableActions = ['in', 'out', 'break_start', 'break_end'] as const;

    return NextResponse.json({
      userId: actor.uid,
      displayName: actor.displayName || actor.email,
      activeShift,
      lastClockIn,
      onBreak,
      suggestedActions,
      availableActions,
      /** @deprecated alias for suggestedActions */
      nextActions: suggestedActions,
      serverLegalTime: {
        iso: legal.iso,
        source: legal.source,
        ntpServer: legal.ntpServer || null,
      },
      compliance: {
        unrestrictedMarks: true,
        noContractualAutoFill: true,
        noOvertimePreApproval: true,
        immutableOriginals: true,
      },
    });
  } catch (error) {
    console.error('[time-clock status GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}

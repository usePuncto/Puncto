import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
  resolveStaffNames,
  serializeTimestamp,
} from '@/lib/time-clock/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/clock-ins
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const { actor } = authResult;
    const filterUserId = !canManageTimeClock(actor) ? actor.uid : userId || undefined;

    const clockInsRef = db.collection('businesses').doc(businessId).collection('clockIns');
    let snapshot;

    try {
      let query: FirebaseFirestore.Query = clockInsRef.orderBy('timestamp', 'desc');
      if (filterUserId) {
        query = query.where('userId', '==', filterUserId);
      }
      snapshot = await query.limit(limit).get();
    } catch {
      const all = await clockInsRef.orderBy('timestamp', 'desc').limit(200).get();
      snapshot = {
        docs: all.docs
          .filter((d) => !filterUserId || d.data().userId === filterUserId)
          .slice(0, limit),
      };
    }

    const clockIns = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: String(data.userId || ''),
        ...data,
        timestamp: serializeTimestamp(data.timestamp),
        createdAt: serializeTimestamp(data.createdAt),
        retentionUntil: serializeTimestamp(data.retentionUntil),
        receiptAvailableUntil: serializeTimestamp(data.receiptAvailableUntil),
        rhReviewedAt: serializeTimestamp(data.rhReviewedAt),
        /** Legacy alias — RH review does not mutate AFD */
        validated: Boolean(data.rhReviewed ?? data.validated),
        validatedAt: serializeTimestamp(data.rhReviewedAt ?? data.validatedAt),
      };
    });

    const names = await resolveStaffNames(
      businessId,
      clockIns.map((c) => c.userId)
    );

    return NextResponse.json({
      clockIns: clockIns.map((c) => ({
        ...c,
        userName: names[c.userId]?.name || c.userId,
        userEmail: names[c.userId]?.email,
      })),
    });
  } catch (error) {
    console.error('[time-clock clock-ins GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch clock-ins' }, { status: 500 });
  }
}

/**
 * PATCH /api/time-clock/clock-ins
 * RH may only acknowledge/review. AFD fields (timestamp, type, nsr, hashes) are immutable.
 * Real corrections go to POST /api/time-clock/adjustments.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, clockInId, rhReviewed, notes } = body as {
      businessId?: string;
      clockInId?: string;
      rhReviewed?: boolean;
      /** @deprecated use rhReviewed */
      validated?: boolean;
      notes?: string;
    };

    const reviewed =
      typeof rhReviewed === 'boolean'
        ? rhReviewed
        : typeof body.validated === 'boolean'
          ? body.validated
          : undefined;

    if (!businessId || !clockInId || typeof reviewed !== 'boolean') {
      return NextResponse.json(
        { error: 'businessId, clockInId and rhReviewed are required' },
        { status: 400 }
      );
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ref = db
      .collection('businesses')
      .doc(businessId)
      .collection('clockIns')
      .doc(clockInId);

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Clock-in not found' }, { status: 404 });
    }

    const now = new Date();
    // Only metadata — never touch timestamp/type/nsr/afdHash/integrityHash
    await ref.update({
      rhReviewed: reviewed,
      rhReviewedBy: authResult.actor.uid,
      rhReviewedAt: now,
      ...(typeof notes === 'string' ? { rhNotes: notes } : {}),
    });

    return NextResponse.json({
      id: clockInId,
      rhReviewed: reviewed,
      rhReviewedBy: authResult.actor.uid,
      rhReviewedAt: now.toISOString(),
      immutable: true,
      message:
        'Revisão de RH registrada. Dados originais do AFD não foram alterados. Use ajustes de tratamento para correções.',
    });
  } catch (error) {
    console.error('[time-clock clock-ins PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update clock-in' }, { status: 500 });
  }
}

/** Explicitly forbid deletion of original marks */
export async function DELETE() {
  return NextResponse.json(
    {
      error:
        'Marcações originais são imutáveis (Portaria 671). Use o módulo de tratamento (/api/time-clock/adjustments).',
    },
    { status: 405 }
  );
}

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
 * GET /api/time-clock/shifts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const { actor } = authResult;
    const filterUserId = !canManageTimeClock(actor) ? actor.uid : userId || undefined;

    const shiftsRef = db.collection('businesses').doc(businessId).collection('shifts');
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];

    try {
      let query: FirebaseFirestore.Query = shiftsRef.orderBy('startTime', 'desc');
      if (filterUserId) query = query.where('userId', '==', filterUserId);
      if (status) query = query.where('status', '==', status);
      const snapshot = await query.limit(100).get();
      docs = snapshot.docs;
    } catch {
      const all = await shiftsRef.orderBy('startTime', 'desc').limit(200).get();
      docs = all.docs
        .filter((d) => {
          const data = d.data();
          if (filterUserId && data.userId !== filterUserId) return false;
          if (status && data.status !== status) return false;
          return true;
        })
        .slice(0, 100);
    }

    const shifts = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: String(data.userId || ''),
        ...data,
        startTime: serializeTimestamp(data.startTime),
        endTime: serializeTimestamp(data.endTime),
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        breakStartedAt: serializeTimestamp(data.breakStartedAt),
      };
    });

    const names = await resolveStaffNames(
      businessId,
      shifts.map((s) => s.userId)
    );

    return NextResponse.json({
      shifts: shifts.map((s) => ({
        ...s,
        userName: names[s.userId]?.name || s.userId,
        userEmail: names[s.userId]?.email,
      })),
    });
  } catch (error) {
    console.error('[time-clock shifts GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Shift } from '@/types/timeClock';

export const dynamic = 'force-dynamic';

// GET - List shifts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const shiftsRef = db.collection('businesses').doc(businessId).collection('shifts');
    let query: FirebaseFirestore.Query = shiftsRef.orderBy('startTime', 'desc');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(100).get();
    const shifts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error('[time-clock shifts GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    );
  }
}


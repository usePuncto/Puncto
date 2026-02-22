import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ClockIn } from '@/types/timeClock';

export const dynamic = 'force-dynamic';

// GET - List clock-ins
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const clockInsRef = db.collection('businesses').doc(businessId).collection('clockIns');
    let query: FirebaseFirestore.Query = clockInsRef.orderBy('timestamp', 'desc');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.limit(limit).get();
    const clockIns = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ clockIns });
  } catch (error) {
    console.error('[time-clock clock-ins GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clock-ins' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { authError, requireBusinessAuth } from '@/lib/auth/requireBusinessAuth';

/**
 * POST /api/waitlist
 * Add customer to waitlist for a service/professional
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, serviceId, professionalId, customerData, preferredDates } = body;

    if (!businessId || !serviceId || !customerData) {
      return NextResponse.json(
        { error: 'businessId, serviceId, and customerData are required' },
        { status: 400 }
      );
    }

    // Create waitlist entry
    const waitlistRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('waitlist')
      .doc();

    await waitlistRef.set({
      serviceId,
      professionalId: professionalId || null,
      customerData,
      preferredDates: preferredDates || [],
      status: 'pending',
      notified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      waitlistId: waitlistRef.id,
    });
  } catch (error: any) {
    console.error('[Waitlist API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add to waitlist', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/waitlist
 * Get waitlist entries for a business
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status') || 'pending';

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireBusinessAuth(request, businessId);
    if (authError(authResult)) return authResult.error;

    const waitlistQuery = db
      .collection('businesses')
      .doc(businessId)
      .collection('waitlist')
      .where('status', '==', status);

    const snapshot = await waitlistQuery.get();

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    }));

    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error('[Waitlist API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist', message: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { authError, requireBusinessAuth } from '@/lib/auth/requireBusinessAuth';

type WaitlistCustomer = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
};

function sanitizeCustomerData(raw: unknown): WaitlistCustomer | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const phone = String(data.phone || '').trim();
  const email = data.email != null ? String(data.email).trim() : undefined;

  if (!firstName || !lastName || !phone) return null;
  if (firstName.length > 80 || lastName.length > 80 || phone.length > 40) return null;
  if (email && email.length > 120) return null;
  if (phone.replace(/\D/g, '').length < 8) return null;

  return {
    firstName,
    lastName,
    phone,
    ...(email ? { email } : {}),
  };
}

/**
 * POST /api/waitlist
 * Add customer to waitlist for a service/professional (public, hardened)
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

    const customer = sanitizeCustomerData(customerData);
    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid customerData' },
        { status: 400 }
      );
    }

    const dates = Array.isArray(preferredDates)
      ? preferredDates
          .filter((d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
          .slice(0, 10)
      : [];

    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const serviceSnap = await businessRef.collection('services').doc(serviceId).get();
    if (!serviceSnap.exists) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    let resolvedProfessionalId: string | null = null;
    if (typeof professionalId === 'string' && professionalId.trim()) {
      const proSnap = await businessRef
        .collection('professionals')
        .doc(professionalId.trim())
        .get();
      if (!proSnap.exists) {
        return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
      }
      resolvedProfessionalId = professionalId.trim();
    }

    const waitlistRef = businessRef.collection('waitlist').doc();

    await waitlistRef.set({
      serviceId,
      professionalId: resolvedProfessionalId,
      customerData: customer,
      preferredDates: dates,
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

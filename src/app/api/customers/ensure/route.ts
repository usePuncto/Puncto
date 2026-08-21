/**
 * POST - Ensure a customer exists for the business (find by phone/email or create).
 * Used when a guest makes a booking - auto-registers them as customer.
 * Public: never overwrites existing PII; no full-collection scans; IP rate-limited.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = checkIpRateLimit(`customers-ensure:${ip}`, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSec) },
        }
      );
    }

    const body = await request.json();
    const { businessId, firstName, lastName, phone, email } = body;

    if (!businessId || !firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'businessId, firstName, lastName and phone are required' },
        { status: 400 }
      );
    }

    if (
      String(firstName).length > 80 ||
      String(lastName).length > 80 ||
      String(phone).length > 40 ||
      (email && String(email).length > 120)
    ) {
      return NextResponse.json({ error: 'Invalid field length' }, { status: 400 });
    }

    const phoneNorm = normalizePhone(phone);
    if (phoneNorm.length < 8) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }

    const businessSnap = await db.collection('businesses').doc(businessId).get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const emailNorm = (email || '').trim().toLowerCase();
    const phoneTrim = phone.trim();
    const customersRef = db.collection('businesses').doc(businessId).collection('customers');

    // Prefer indexed lookups — never scan the whole customers collection
    if (emailNorm) {
      const byEmail = await customersRef.where('email', '==', (email || '').trim()).limit(1).get();
      if (!byEmail.empty) {
        return NextResponse.json({ customerId: byEmail.docs[0].id, existing: true });
      }
    }

    const byPhone = await customersRef.where('phone', '==', phoneTrim).limit(1).get();
    if (!byPhone.empty) {
      return NextResponse.json({ customerId: byPhone.docs[0].id, existing: true });
    }

    // Digits-only match for legacy docs that stored formatted phones differently
    // Limited query via phoneNorm field if present; otherwise create new
    const byPhoneNorm = await customersRef.where('phoneNorm', '==', phoneNorm).limit(1).get();
    if (!byPhoneNorm.empty) {
      return NextResponse.json({ customerId: byPhoneNorm.docs[0].id, existing: true });
    }

    const now = new Date();
    const newCustomer = {
      businessId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phoneTrim,
      phoneNorm,
      email: (email || '').trim() || '',
      totalBookings: 0,
      totalSpent: 0,
      consentGiven: true,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await customersRef.add(newCustomer);
    return NextResponse.json({ customerId: docRef.id, existing: false });
  } catch (error) {
    console.error('[customers/ensure] Error:', error);
    return NextResponse.json(
      { error: 'Failed to ensure customer' },
      { status: 500 }
    );
  }
}

/**
 * POST - Ensure a customer exists for the business (find by phone/email or create).
 * Used when a guest makes a booking - auto-registers them as customer.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export async function POST(request: NextRequest) {
  try {
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

    const businessSnap = await db.collection('businesses').doc(businessId).get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const phoneNorm = normalizePhone(phone);
    const emailNorm = (email || '').trim().toLowerCase();

    const customersRef = db.collection('businesses').doc(businessId).collection('customers');
    const snapshot = await customersRef.get();

    const existing = snapshot.docs.find((d) => {
      const data = d.data();
      const existingPhone = normalizePhone(data.phone || '');
      const existingEmail = (data.email || '').trim().toLowerCase();
      return (
        (phoneNorm && phoneNorm.length >= 8 && existingPhone === phoneNorm) ||
        (emailNorm && existingEmail === emailNorm)
      );
    });

    if (existing) {
      const customerId = existing.id;
      const data = existing.data();
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (firstName.trim() !== (data.firstName || '')) updates.firstName = firstName.trim();
      if (lastName.trim() !== (data.lastName || '')) updates.lastName = lastName.trim();
      if (emailNorm && (data.email || '').toLowerCase() !== emailNorm) updates.email = email?.trim() || '';

      if (Object.keys(updates).length > 1) {
        await existing.ref.update(updates);
      }

      return NextResponse.json({ customerId, existing: true });
    }

    const now = new Date();
    const newCustomer = {
      businessId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
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

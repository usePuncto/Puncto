import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { requireMobileTenantAuth } from '@/lib/api/mobileTenantAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mobile/admin/bookings?businessId=optional&limit=50
 */
export async function GET(request: NextRequest) {
  const auth = await requireMobileTenantAuth(request);
  if ('response' in auth) return auth.response;

  const { businessId } = auth;
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10) || 50, 100);

  try {
    const snap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('bookings')
      .orderBy('scheduledDateTime', 'desc')
      .limit(limit)
      .get();

    const bookings = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      const scheduledDateTime = data.scheduledDateTime?.toDate?.() ?? data.scheduledDateTime;
      return {
        id: docSnap.id,
        status: data.status,
        serviceName: data.serviceName ?? null,
        professionalName: data.professionalName ?? null,
        customerName: data.customerData?.name ?? data.customerName ?? null,
        scheduledDateTime: scheduledDateTime instanceof Date ? scheduledDateTime.toISOString() : null,
        price: data.price ?? null,
        notes: data.notes ?? null,
      };
    });

    return NextResponse.json({ businessId, bookings });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[mobile/admin/bookings]', e);
    return NextResponse.json({ error: 'Failed to load bookings', message }, { status: 500 });
  }
}

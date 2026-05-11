import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { requireMobileTenantAuth } from '@/lib/api/mobileTenantAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mobile/admin/dashboard?businessId=optional
 * Lightweight counts for the native admin home screen.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMobileTenantAuth(request);
  if ('response' in auth) return auth.response;

  const { businessId } = auth;
  const root = db.collection('businesses').doc(businessId);

  try {
    const [customersAgg, servicesAgg, bookingsRecent] = await Promise.all([
      (root.collection('customers') as { count: () => { get: () => Promise<{ data: () => { count: number } }> } })
        .count()
        .get(),
      (root.collection('services') as { count: () => { get: () => Promise<{ data: () => { count: number } }> } })
        .count()
        .get(),
      root.collection('bookings').orderBy('scheduledDateTime', 'desc').limit(5).get(),
    ]);

    const recentBookings = bookingsRecent.docs.map((docSnap) => {
      const data = docSnap.data();
      const scheduledDateTime = data.scheduledDateTime?.toDate?.() ?? data.scheduledDateTime;
      return {
        id: docSnap.id,
        status: data.status,
        serviceName: data.serviceName ?? null,
        customerName: data.customerData?.name ?? data.customerName ?? null,
        scheduledDateTime: scheduledDateTime instanceof Date ? scheduledDateTime.toISOString() : null,
      };
    });

    return NextResponse.json({
      businessId,
      counts: {
        customers: customersAgg.data().count,
        services: servicesAgg.data().count,
      },
      recentBookings,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[mobile/admin/dashboard]', e);
    return NextResponse.json({ error: 'Failed to load dashboard', message }, { status: 500 });
  }
}

/**
 * POST - Create in-app notifications for a booking.
 * Called after a booking is created when Cloud Functions might not run (e.g. local dev, emulator).
 * Idempotent: safe to call multiple times for the same booking.
 *
 * Auth: business staff Bearer token, OR notifyToken matching the booking document
 * (set at create time by the guest/staff client).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getStaffNotificationRecipientUserIds } from '@/lib/server/staffNotificationRecipients';
import { authError, requireBusinessAuth } from '@/lib/auth/requireBusinessAuth';
import { timingSafeEqual } from 'crypto';

function buildCustomerName(customerData: { firstName?: string; lastName?: string } | undefined): string {
  const first = customerData?.firstName || '';
  const last = customerData?.lastName || '';
  return `${first} ${last}`.trim();
}

function tokensEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, bookingId, notifyToken } = body as {
      businessId?: string;
      bookingId?: string;
      notifyToken?: string;
    };

    if (!businessId || !bookingId) {
      return NextResponse.json(
        { error: 'businessId and bookingId are required' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    let authorized = false;

    if (authHeader?.startsWith('Bearer ')) {
      const authResult = await requireBusinessAuth(request, businessId);
      if (!authError(authResult)) {
        authorized = true;
      }
    }

    const bookingRef = db.collection('businesses').doc(businessId).collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingSnap.data();

    if (!authorized) {
      const stored =
        typeof booking?.notifyToken === 'string' ? booking.notifyToken : '';
      if (
        !notifyToken ||
        typeof notifyToken !== 'string' ||
        stored.length < 16 ||
        !tokensEqual(stored, notifyToken)
      ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const createdAt = booking?.createdAt?.toDate?.() ?? booking?.createdAt;
    const createdMs =
      createdAt instanceof Date
        ? createdAt.getTime()
        : typeof createdAt === 'string'
          ? Date.parse(createdAt)
          : 0;
    // Only allow notifying for very recently created bookings (anti spam)
    if (!createdMs || Date.now() - createdMs > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Booking is not eligible for notification creation' },
        { status: 403 }
      );
    }

    const recipientUserIds = await getStaffNotificationRecipientUserIds(
      businessId,
      booking?.professionalId,
    );

    if (recipientUserIds.length === 0) {
      return NextResponse.json({ ok: true, message: 'No recipients to notify' });
    }

    const customerName = buildCustomerName(booking?.customerData);
    const { Timestamp } = await import('firebase-admin/firestore');

    await Promise.all(
      recipientUserIds.map(async (recipientUserId) => {
        const notificationId = `${bookingId}_booking.created_${recipientUserId}`;
        const notifRef = db
          .collection('businesses')
          .doc(businessId)
          .collection('notifications')
          .doc(notificationId);

        const scheduledDt = booking?.scheduledDateTime;
        await notifRef.set(
          {
            id: notificationId,
            businessId,
            bookingId,
            eventType: 'booking.created',
            recipientUserId,
            isRead: false,
            readAt: null,
            createdAt: Timestamp.now(),
            serviceName: booking?.serviceName || '',
            professionalName: booking?.professionalName || '',
            customerName,
            scheduledDateTime: scheduledDt,
            bookingStatus: booking?.status || 'pending',
          },
          { merge: false }
        );
      })
    );

    return NextResponse.json({ ok: true, count: recipientUserIds.length });
  } catch (error) {
    console.error('[bookings/create-notifications] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create notifications' },
      { status: 500 }
    );
  }
}

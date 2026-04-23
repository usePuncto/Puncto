/**
 * POST - Create in-app notifications for a booking.
 * Called after a booking is created when Cloud Functions might not run (e.g. local dev, emulator).
 * Idempotent: safe to call multiple times for the same booking.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getStaffNotificationRecipientUserIds } from '@/lib/server/staffNotificationRecipients';

function buildCustomerName(customerData: { firstName?: string; lastName?: string } | undefined): string {
  const first = customerData?.firstName || '';
  const last = customerData?.lastName || '';
  return `${first} ${last}`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, bookingId } = body;

    if (!businessId || !bookingId) {
      return NextResponse.json(
        { error: 'businessId and bookingId are required' },
        { status: 400 }
      );
    }

    const bookingRef = db.collection('businesses').doc(businessId).collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingSnap.data();
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

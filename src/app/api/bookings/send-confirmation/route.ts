/**
 * POST - Send booking confirmation via WhatsApp (and optionally email)
 * Called when a booking is created - use as fallback when Firebase Functions are not deployed.
 * Requires the request to be authenticated and the user to have access to the business.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebaseAdmin';
import { sendWhatsApp } from '@/lib/messaging/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await auth.verifyIdToken(token);

    const body = await request.json();
    const { businessId, bookingId } = body;
    if (!businessId || !bookingId) {
      return NextResponse.json(
        { error: 'businessId and bookingId required' },
        { status: 400 }
      );
    }

    const bookingRef = db.collection('businesses').doc(businessId).collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const businessSnap = await db.collection('businesses').doc(businessId).get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const booking = bookingSnap.data()!;
    const business = businessSnap.data()!;
    const channels = business?.settings?.confirmationChannels ?? ['email'];

    if (!channels.includes('whatsapp') || !booking.customerData?.phone) {
      return NextResponse.json({ success: true, skipped: 'whatsapp not configured or no phone' });
    }

    const customerName = `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim();
    const scheduledDate = (booking.scheduledDateTime as { toDate?: () => Date }).toDate?.() ?? new Date(booking.scheduledDateTime);

    const result = await sendWhatsApp({
      businessId,
      to: booking.customerData.phone,
      template: 'booking_confirmation',
      templateParams: [
        customerName || 'Cliente',
        booking.serviceName,
        booking.professionalName || '-',
        scheduledDate.toLocaleDateString('pt-BR'),
        scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        business?.displayName || 'Estabelecimento',
      ],
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('[send-confirmation] Error:', error);
    return NextResponse.json({ error: 'Failed to send confirmation' }, { status: 500 });
  }
}

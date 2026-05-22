/**
 * POST - Envia confirmação de agendamento (público, após vitrine).
 * Sem login: valida que o booking existe e foi criado nos últimos 15 minutos.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { sendBookingConfirmation } from '@/lib/server/sendBookingConfirmation';

const MAX_AGE_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, bookingId } = body as { businessId?: string; bookingId?: string };

    if (!businessId || !bookingId) {
      return NextResponse.json({ error: 'businessId and bookingId required' }, { status: 400 });
    }

    const bookingSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('bookings')
      .doc(bookingId)
      .get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const createdAt = bookingSnap.data()?.createdAt;
    const createdMs =
      createdAt && typeof createdAt.toDate === 'function'
        ? createdAt.toDate().getTime()
        : Date.now();

    if (Date.now() - createdMs > MAX_AGE_MS) {
      return NextResponse.json({ error: 'Booking too old for public confirmation' }, { status: 403 });
    }

    const result = await sendBookingConfirmation(businessId, bookingId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[send-confirmation-public] Error:', error);
    return NextResponse.json({ error: 'Failed to send confirmation' }, { status: 500 });
  }
}

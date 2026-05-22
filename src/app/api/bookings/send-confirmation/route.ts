/**
 * POST - Send booking confirmation (authenticated staff).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import { sendBookingConfirmation } from '@/lib/server/sendBookingConfirmation';

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
      return NextResponse.json({ error: 'businessId and bookingId required' }, { status: 400 });
    }

    const result = await sendBookingConfirmation(businessId, bookingId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[send-confirmation] Error:', error);
    return NextResponse.json({ error: 'Failed to send confirmation' }, { status: 500 });
  }
}

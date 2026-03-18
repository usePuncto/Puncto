import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      );
    }

    // Return the checkout URL and metadata
    return NextResponse.json({
      url: session.url,
      status: session.status,
      paymentStatus: session.payment_status,
      businessId: session.metadata?.businessId,
    });
  } catch (error: any) {
    console.error('Error retrieving checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Error retrieving checkout session' },
      { status: 500 }
    );
  }
}

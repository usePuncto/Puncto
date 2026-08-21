import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { CreateCheckoutSessionParams } from '@/lib/stripe/types';
import { createCheckoutSessionWithBrlMethods } from '@/lib/stripe/paymentMethods';
import { db } from '@/lib/firebaseAdmin';
import { isAllowedCheckoutRedirectUrl } from '@/lib/payments/checkoutRedirect';

export async function POST(request: NextRequest) {
  try {
    const body: CreateCheckoutSessionParams = await request.json();
    
    const {
      businessId,
      amount,
      currency,
      customerEmail,
      customerName,
      description,
      metadata,
      successUrl,
      cancelUrl,
      paymentMethodTypes = ['card', 'pix'],
    } = body;

    // Validate required fields
    if (!businessId || !amount || !currency || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 50) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!isAllowedCheckoutRedirectUrl(successUrl) || !isAllowedCheckoutRedirectUrl(cancelUrl)) {
      return NextResponse.json(
        { error: 'Invalid success or cancel URL' },
        { status: 400 }
      );
    }

    // Get business to verify it exists
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Public booking checkout: bind session to an existing booking (anti abuse)
    const bookingId =
      typeof metadata?.bookingId === 'string' ? metadata.bookingId.trim() : '';
    if (!bookingId) {
      return NextResponse.json(
        { error: 'metadata.bookingId is required' },
        { status: 400 }
      );
    }
    const bookingDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('bookings')
      .doc(bookingId)
      .get();
    if (!bookingDoc.exists) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Create Stripe Checkout Session
    const sessionParams: any = {
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || 'Service Payment',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session =
      currency.toLowerCase() === 'brl'
        ? await createCheckoutSessionWithBrlMethods(sessionParams)
        : await stripe.checkout.sessions.create({
            ...sessionParams,
            payment_method_types: ['card'],
          });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[create-checkout] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
}

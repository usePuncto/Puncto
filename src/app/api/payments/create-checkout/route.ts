import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { CreateCheckoutSessionParams } from '@/lib/stripe/types';
import { createCheckoutSessionWithBrlMethods } from '@/lib/stripe/paymentMethods';
import { db } from '@/lib/firebaseAdmin';
import { isAllowedCheckoutRedirectUrl } from '@/lib/payments/checkoutRedirect';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';

function toCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  // Values already in cents tend to be >= 1000 for typical BRL services (R$10+)
  // but deposits can be small. Prefer treating values with decimals as reais.
  if (!Number.isInteger(value) || value < 50) {
    return Math.round(value * 100);
  }
  // Integer: if looks like reais under R$500 without cents, still *100 when < 500
  // Booking/service prices in this app are stored in reais (e.g. 150 = R$150).
  if (value < 1000) {
    return Math.round(value * 100);
  }
  return Math.round(value);
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = checkIpRateLimit(`create-checkout:${ip}`, {
      limit: 40,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    const body: CreateCheckoutSessionParams = await request.json();

    const {
      businessId,
      currency,
      customerEmail,
      description,
      metadata,
      successUrl,
      cancelUrl,
      paymentMethodTypes = ['card', 'pix'],
    } = body;

    if (!businessId || !currency || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isAllowedCheckoutRedirectUrl(successUrl) || !isAllowedCheckoutRedirectUrl(cancelUrl)) {
      return NextResponse.json(
        { error: 'Invalid success or cancel URL' },
        { status: 400 }
      );
    }

    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

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

    const booking = bookingDoc.data() as {
      serviceId?: string;
      price?: number;
      depositAmount?: number;
      paymentStatus?: string;
      serviceName?: string;
    };

    if (booking.paymentStatus === 'succeeded') {
      return NextResponse.json(
        { error: 'Booking already paid' },
        { status: 400 }
      );
    }

    const serviceId =
      (typeof metadata?.serviceId === 'string' && metadata.serviceId) ||
      booking.serviceId ||
      '';

    let serviceData: {
      name?: string;
      price?: number;
      depositAmount?: number;
      requiresDeposit?: boolean;
    } | null = null;

    if (serviceId) {
      const serviceDoc = await db
        .collection('businesses')
        .doc(businessId)
        .collection('services')
        .doc(serviceId)
        .get();
      if (serviceDoc.exists) {
        serviceData = serviceDoc.data() as {
          name?: string;
          price?: number;
          depositAmount?: number;
          requiresDeposit?: boolean;
        };
      }
    }

    const fullCents =
      toCents(serviceData?.price) ??
      toCents(booking.price) ??
      null;
    const depositCents =
      toCents(serviceData?.depositAmount) ??
      toCents(booking.depositAmount) ??
      null;

    const wantsDeposit =
      metadata?.paymentType === 'deposit' &&
      Boolean(serviceData?.requiresDeposit || depositCents);

    const amount =
      wantsDeposit && depositCents != null && depositCents >= 50
        ? depositCents
        : fullCents;

    if (amount == null || amount < 50) {
      return NextResponse.json(
        { error: 'Unable to resolve payment amount from booking/service' },
        { status: 400 }
      );
    }

    const paymentType = wantsDeposit && amount === depositCents ? 'deposit' : 'full';
    const lineName =
      description ||
      serviceData?.name ||
      booking.serviceName ||
      'Service Payment';

    const sessionMetadata = {
      ...(metadata || {}),
      businessId,
      bookingId,
      serviceId,
      paymentType,
      amount: String(amount),
      currency: currency.toLowerCase(),
    };

    const sessionParams: Record<string, unknown> = {
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: lineName,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: sessionMetadata,
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session =
      currency.toLowerCase() === 'brl'
        ? await createCheckoutSessionWithBrlMethods(sessionParams as any)
        : await stripe.checkout.sessions.create({
            ...(sessionParams as any),
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

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { CreatePaymentLinkParams } from '@/lib/stripe/types';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import QRCode from 'qrcode';

function stripUndefined<T extends Record<string, any>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function parseExpiresAtInput(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentLinkParams & { generateQR?: boolean } = await request.json();

    const {
      businessId,
      name,
      amount,
      currency,
      description,
      metadata = {},
      expiresAt,
      generateQR = true,
    } = body;
    const parsedExpiresAt = parseExpiresAtInput(expiresAt);

    if (!businessId || !name || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify business exists
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }
    const businessData = businessDoc.data() as { stripeConnectAccountId?: string } | undefined;
    const stripeAccount = businessData?.stripeConnectAccountId;
    if (!stripeAccount) {
      return NextResponse.json(
        { error: 'Conecte a conta Stripe do negocio antes de criar links.' },
        { status: 400 }
      );
    }

    // Create Stripe Payment Link
    const paymentLinkParams: any = {
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name,
              description: description || undefined,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        ...metadata,
        businessId,
      },
    };

    if (expiresAt && !parsedExpiresAt) {
      return NextResponse.json(
        { error: 'Invalid expiresAt. Use a valid date string, timestamp, or Date.' },
        { status: 400 }
      );
    }

    // Stripe Payment Links (API 2025-12-15) does not accept expires_at.
    // We keep expiration as internal metadata in Firestore and enforce it in the app.

    // Pix precisa estar habilitado na conta Stripe.
    // Em desenvolvimento/teste pode não estar, então fazemos fallback automático.
    if (currency.toLowerCase() === 'brl') {
      paymentLinkParams.payment_method_types = ['card', 'pix'];
    } else {
      paymentLinkParams.payment_method_types = ['card'];
    }

    let paymentLink: any;
    try {
      paymentLink = await stripe.paymentLinks.create(paymentLinkParams, { stripeAccount });
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      // Fallback: retry without pix if Stripe says pix is invalid/unavailable.
      if (message.toLowerCase().includes('pix') && message.toLowerCase().includes('invalid')) {
        console.warn('[create-payment-link] Pix not enabled/available; retrying with card only.');
        paymentLinkParams.payment_method_types = ['card'];
        paymentLink = await stripe.paymentLinks.create(paymentLinkParams, { stripeAccount });
      } else {
        throw err;
      }
    }

    // Ensure PaymentIntent metadata includes pl_ id so webhooks can mark this Firestore link as paid.
    await stripe.paymentLinks.update(
      paymentLink.id,
      {
        metadata: {
          ...metadata,
          businessId,
          stripePaymentLinkStripeId: paymentLink.id,
        },
      },
      { stripeAccount }
    );

    // Generate QR code if requested
    let qrCodeUrl: string | undefined;
    if (generateQR) {
      qrCodeUrl = await QRCode.toDataURL(paymentLink.url);
    }

    // Save payment link to Firestore
    const paymentLinkData = stripUndefined({
      businessId,
      name,
      description: description || undefined,
      amount,
      currency,
      stripePaymentLinkId: paymentLink.id,
      stripePaymentLinkUrl: paymentLink.url,
      qrCodeUrl,
      active: true,
      metadata,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      expiresAt: parsedExpiresAt ? Timestamp.fromDate(parsedExpiresAt) : undefined,
    });

    const paymentLinksRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('paymentLinks');

    const docRef = await paymentLinksRef.add(paymentLinkData);

    return NextResponse.json({
      id: docRef.id,
      ...paymentLinkData,
      paymentLinkUrl: paymentLink.url,
    });
  } catch (error) {
    console.error('[create-payment-link] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create payment link: ${errorMessage}` },
      { status: 500 }
    );
  }
}

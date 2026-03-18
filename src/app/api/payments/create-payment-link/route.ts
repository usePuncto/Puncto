import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { CreatePaymentLinkParams } from '@/lib/stripe/types';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import QRCode from 'qrcode';

function stripUndefined<T extends Record<string, any>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
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

    if (expiresAt) {
      paymentLinkParams.expires_at = Math.floor(expiresAt.getTime() / 1000);
    }

    // Pix precisa estar habilitado na conta Stripe.
    // Em desenvolvimento/teste pode não estar, então fazemos fallback automático.
    if (currency.toLowerCase() === 'brl') {
      paymentLinkParams.payment_method_types = ['card', 'pix'];
    } else {
      paymentLinkParams.payment_method_types = ['card'];
    }

    let paymentLink: any;
    try {
      paymentLink = await stripe.paymentLinks.create(paymentLinkParams);
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      // Fallback: retry without pix if Stripe says pix is invalid/unavailable.
      if (message.toLowerCase().includes('pix') && message.toLowerCase().includes('invalid')) {
        console.warn('[create-payment-link] Pix not enabled/available; retrying with card only.');
        paymentLinkParams.payment_method_types = ['card'];
        paymentLink = await stripe.paymentLinks.create(paymentLinkParams);
      } else {
        throw err;
      }
    }

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
      expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : undefined,
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

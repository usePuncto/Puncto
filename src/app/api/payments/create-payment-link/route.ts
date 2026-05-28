import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { STRIPE_CONNECT_ACCOUNT_INVALID_MESSAGE, isStripeConnectAccountInvalidError } from '@/lib/stripe/connectErrors';
import { createBoletoCheckoutSession, ensureBoletoReadyForConnectedAccount } from '@/lib/stripe/boletoConnect';
import { BRL_STANDARD_PAYMENT_LINK_TYPES, createStripePaymentLinkWithMethods } from '@/lib/stripe/paymentMethods';
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
      linkKind = 'payment',
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
        linkKind,
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

    const resolvedLinkKind = linkKind === 'boleto' ? 'boleto' : 'payment';
    if (resolvedLinkKind === 'boleto' && currency.toLowerCase() !== 'brl') {
      return NextResponse.json(
        { error: 'Boletos estão disponíveis apenas para cobranças em BRL (R$).' },
        { status: 400 }
      );
    }
    if (resolvedLinkKind === 'boleto') {
      if (amount < 500 || amount > 4_999_999) {
        return NextResponse.json(
          { error: 'Boleto deve ter valor entre R$ 5,00 e R$ 49.999,99.' },
          { status: 400 }
        );
      }
      try {
        await ensureBoletoReadyForConnectedAccount(stripeAccount);
      } catch (capErr) {
        const msg = capErr instanceof Error ? capErr.message : String(capErr);
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (resolvedLinkKind === 'boleto') {
      const checkoutSession = await createBoletoCheckoutSession(
        {
          name,
          description,
          amount,
          metadata: {
            ...metadata,
            businessId,
            linkKind: 'boleto',
          },
          successUrl: `${baseUrl}/tenant/admin/payments?boleto=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}/tenant/admin/payments?boleto=cancel`,
        },
        stripeAccount
      );

      if (!checkoutSession.url) {
        return NextResponse.json({ error: 'Stripe não retornou URL do checkout de boleto.' }, { status: 500 });
      }

      let qrCodeUrl: string | undefined;
      if (generateQR) {
        qrCodeUrl = await QRCode.toDataURL(checkoutSession.url);
      }

      const paymentLinkData = stripUndefined({
        businessId,
        linkKind: 'boleto' as const,
        name,
        description: description || undefined,
        amount,
        currency,
        stripePaymentLinkId: checkoutSession.id,
        stripeCheckoutSessionId: checkoutSession.id,
        stripePaymentLinkUrl: checkoutSession.url,
        qrCodeUrl,
        active: true,
        metadata,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        expiresAt: parsedExpiresAt ? Timestamp.fromDate(parsedExpiresAt) : undefined,
      });

      const docRef = await db
        .collection('businesses')
        .doc(businessId)
        .collection('paymentLinks')
        .add(paymentLinkData);

      await stripe.checkout.sessions.update(
        checkoutSession.id,
        {
          metadata: {
            ...metadata,
            businessId,
            linkKind: 'boleto',
            stripePaymentLinkStripeId: checkoutSession.id,
            punctoPaymentLinkDocId: docRef.id,
          },
        },
        { stripeAccount }
      );

      return NextResponse.json({
        id: docRef.id,
        ...paymentLinkData,
        paymentLinkUrl: checkoutSession.url,
      });
    }

    let paymentLink: Awaited<ReturnType<typeof createStripePaymentLinkWithMethods>>;
    if (currency.toLowerCase() === 'brl') {
      paymentLink = await createStripePaymentLinkWithMethods(
        paymentLinkParams,
        stripeAccount,
        BRL_STANDARD_PAYMENT_LINK_TYPES
      );
    } else {
      paymentLinkParams.payment_method_types = ['card'];
      paymentLink = await stripe.paymentLinks.create(paymentLinkParams, { stripeAccount });
    }

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

    let qrCodeUrl: string | undefined;
    if (generateQR) {
      qrCodeUrl = await QRCode.toDataURL(paymentLink.url);
    }

    const paymentLinkData = stripUndefined({
      businessId,
      linkKind: resolvedLinkKind,
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

    const docRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('paymentLinks')
      .add(paymentLinkData);

    return NextResponse.json({
      id: docRef.id,
      ...paymentLinkData,
      paymentLinkUrl: paymentLink.url,
    });
  } catch (error) {
    console.error('[create-payment-link] Error:', error);
    if (isStripeConnectAccountInvalidError(error)) {
      return NextResponse.json({ error: STRIPE_CONNECT_ACCOUNT_INVALID_MESSAGE }, { status: 403 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const lower = errorMessage.toLowerCase();
    if (lower.includes('boleto') && lower.includes('invalid')) {
      return NextResponse.json(
        {
          error:
            'Boleto não está ativo na conta Stripe conectada do negócio (não basta ativar na conta principal). ' +
            'No Dashboard: Configurações → Connect → Métodos de pagamento → Contas conectadas → ative Boleto. ' +
            'Depois, em Connect → Contas, abra a conta do negócio e confirme a capability boleto_payments como ativa.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Failed to create payment link: ${errorMessage}` },
      { status: 500 }
    );
  }
}

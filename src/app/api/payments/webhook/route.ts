import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe/webhooks';
import { stripe } from '@/lib/stripe/client';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = await verifyWebhookSignature(request, body);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      // Subscription/product events are handled by /api/subscriptions/webhook
      // These events are normal when creating products in Stripe Dashboard
      case 'product.created':
      case 'product.updated':
      case 'price.created':
      case 'plan.created':
        // Ignore - these are subscription management events
        console.log(`[webhook] Ignoring subscription event: ${event.type}`);
        break;

      default:
        console.log(`[webhook] Unhandled payment event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Webhook error: ${errorMessage}` },
      { status: 400 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const businessId = metadata.businessId;
  const bookingId = metadata.bookingId;

  if (!businessId) {
    console.error('[webhook] Missing businessId in metadata');
    return;
  }

  // Create payment record
  const methodTypes = (session.payment_method_types || []) as string[];
  const paymentMethod: 'card' | 'pix' =
    methodTypes.includes('pix') ? 'pix' : 'card';

  const paymentData = {
    businessId,
    bookingId: bookingId || null,
    customerEmail: session.customer_email || session.customer_details?.email || null,
    customerName: session.customer_details?.name || null,
    amount: session.amount_total || 0,
    currency: session.currency || 'brl',
    status: 'succeeded',
    paymentMethod,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    stripeCheckoutSessionId: session.id,
    metadata,
    description: (session as any).description || undefined,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    succeededAt: Timestamp.now(),
  };

  const paymentRef = await db
    .collection('businesses')
    .doc(businessId)
    .collection('payments')
    .add(paymentData);

  // Update booking if exists
  if (bookingId) {
    const bookingRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('bookings')
      .doc(bookingId);

    await bookingRef.update({
      paymentId: paymentRef.id,
      paymentStatus: 'succeeded',
      amountPaid: session.amount_total || 0,
      status: 'confirmed',
      updatedAt: Timestamp.now(),
    });

    // Publish real-time update via Centrifugo if needed
    // This would be handled by a Cloud Function or API route
  }

  console.log(`[webhook] Payment created: ${paymentRef.id} for booking: ${bookingId}`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const businessId = metadata.businessId;
  const bookingId = metadata.bookingId;

  if (!businessId) return;

  // Update payment record if exists
  if (bookingId) {
    const paymentsQuery = await db
      .collection('businesses')
      .doc(businessId)
      .collection('payments')
      .where('bookingId', '==', bookingId)
      .where('stripePaymentIntentId', '==', paymentIntent.id)
      .limit(1)
      .get();

    if (!paymentsQuery.empty) {
      const paymentDoc = paymentsQuery.docs[0];
      await paymentDoc.ref.update({
        status: 'succeeded',
        stripeChargeId: paymentIntent.latest_charge as string || null,
        succeededAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const businessId = metadata.businessId;
  const bookingId = metadata.bookingId;

  if (!businessId || !bookingId) return;

  // Update payment and booking status
  const paymentsQuery = await db
    .collection('businesses')
    .doc(businessId)
    .collection('payments')
    .where('bookingId', '==', bookingId)
    .where('stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (!paymentsQuery.empty) {
    const paymentDoc = paymentsQuery.docs[0];
    await paymentDoc.ref.update({
      status: 'failed',
      failedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  const bookingRef = db
    .collection('businesses')
    .doc(businessId)
    .collection('bookings')
    .doc(bookingId);

  await bookingRef.update({
    paymentStatus: 'failed',
    updatedAt: Timestamp.now(),
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const metadata = charge.metadata || {};
  const businessId = metadata.businessId;
  const paymentId = metadata.paymentId;

  if (!businessId || !paymentId) return;

  const paymentRef = db
    .collection('businesses')
    .doc(businessId)
    .collection('payments')
    .doc(paymentId);

  const paymentDoc = await paymentRef.get();
  if (!paymentDoc.exists) return;

  const refundAmount = charge.amount_refunded;
  const paymentData = paymentDoc.data();

  // Create refund record
  const refundData = {
    id: charge.refunds?.data[0]?.id || `ref_${Date.now()}`,
    businessId,
    paymentId,
    amount: refundAmount,
    currency: charge.currency,
    reason: 'requested_by_customer',
    status: 'succeeded' as const,
    stripeRefundId: charge.refunds?.data[0]?.id || '',
    createdAt: Timestamp.now(),
    processedAt: Timestamp.now(),
  };

  const refundsRef = paymentRef.collection('refunds');
  await refundsRef.add(refundData);

  // Update payment status
  const newStatus = refundAmount >= (paymentData?.amount || 0) ? 'refunded' : 'partially_refunded';
  await paymentRef.update({
    status: newStatus,
    refundedAmount: refundAmount,
    updatedAt: Timestamp.now(),
  });

  // Update booking if linked
  if (paymentData?.bookingId) {
    const bookingRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('bookings')
      .doc(paymentData.bookingId);

    await bookingRef.update({
      paymentStatus: 'refunded',
      updatedAt: Timestamp.now(),
    });
  }
}

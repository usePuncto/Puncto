import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe/webhooks';
import { stripe } from '@/lib/stripe/client';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';

/** Firestore rejects undefined in documents — strip before add/update. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Record<string, unknown>;
}

async function markPaymentLinkPaidInFirestore(
  businessId: string,
  stripePaymentLinkStripeId: string | undefined,
  paymentDocId: string
) {
  if (!stripePaymentLinkStripeId) return;
  try {
    const snap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('paymentLinks')
      .where('stripePaymentLinkId', '==', stripePaymentLinkStripeId)
      .limit(1)
      .get();
    if (snap.empty) return;
    const ref = snap.docs[0].ref;
    const d = snap.docs[0].data();
    await ref.update({
      paidAt: d.paidAt ?? Timestamp.now(),
      lastPaymentId: paymentDocId,
      paymentCount: FieldValue.increment(1),
      active: false,
      updatedAt: Timestamp.now(),
    });
    try {
      const businessSnap = await db.collection('businesses').doc(businessId).get();
      const businessData = businessSnap.data() as { stripeConnectAccountId?: string } | undefined;
      const stripeAccount = businessData?.stripeConnectAccountId;
      if (stripeAccount) {
        await stripe.paymentLinks.update(
          stripePaymentLinkStripeId,
          { active: false },
          { stripeAccount }
        );
      }
    } catch (e) {
      console.warn('[webhook] auto-disable payment link:', (e as Error)?.message);
    }
  } catch (e) {
    console.warn('[webhook] markPaymentLinkPaidInFirestore:', (e as Error)?.message);
  }
}

async function getLinkedCustomerIdByPaymentLink(
  businessId: string,
  stripePaymentLinkStripeId: string | undefined
): Promise<string | undefined> {
  if (!stripePaymentLinkStripeId) return undefined;
  const snap = await db
    .collection('businesses')
    .doc(businessId)
    .collection('paymentLinks')
    .where('stripePaymentLinkId', '==', stripePaymentLinkStripeId)
    .limit(1)
    .get();
  if (snap.empty) return undefined;
  return (snap.docs[0].data() as { linkedCustomerId?: string }).linkedCustomerId;
}

async function upsertStudentSubscriptionFromStripe(params: {
  businessId: string;
  customerId?: string;
  stripeSubscriptionId: string;
  stripeCustomerId?: string;
  status: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}) {
  const { businessId, customerId, stripeSubscriptionId, stripeCustomerId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd } = params;
  const col = db.collection('businesses').doc(businessId).collection('studentSubscriptions');
  const byStripeSub = await col.where('stripeSubscriptionId', '==', stripeSubscriptionId).limit(1).get();
  const payload = stripUndefined({
    businessId,
    customerId,
    stripeSubscriptionId,
    stripeCustomerId,
    status,
    cancelAtPeriodEnd,
    currentPeriodStart: currentPeriodStart ? Timestamp.fromMillis(currentPeriodStart * 1000) : undefined,
    currentPeriodEnd: currentPeriodEnd ? Timestamp.fromMillis(currentPeriodEnd * 1000) : undefined,
    updatedAt: Timestamp.now(),
  });
  if (!byStripeSub.empty) {
    await byStripeSub.docs[0].ref.update(payload);
    return byStripeSub.docs[0].id;
  }
  const created = await col.add({ ...payload, createdAt: Timestamp.now() });
  return created.id;
}

async function resolveBusinessIdFromCheckoutSession(session: Stripe.Checkout.Session): Promise<string | null> {
  const meta = session.metadata || {};
  if (meta.businessId) return meta.businessId;

  const plRef = session.payment_link;
  if (!plRef) return null;

  const plId = typeof plRef === 'string' ? plRef : (plRef as Stripe.PaymentLink).id;
  try {
    const pl = await stripe.paymentLinks.retrieve(plId);
    const fromPl = pl.metadata?.businessId;
    if (fromPl) return fromPl;
  } catch (e) {
    console.warn('[webhook] Could not retrieve Payment Link for businessId:', (e as Error)?.message);
  }

  try {
    const snap = await db
      .collectionGroup('paymentLinks')
      .where('stripePaymentLinkId', '==', plId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const data = snap.docs[0].data() as { businessId?: string };
      return data.businessId || null;
    }
  } catch (e) {
    console.warn('[webhook] paymentLinks lookup failed:', (e as Error)?.message);
  }

  return null;
}

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

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleStudentSubscriptionUpdated(subscription);
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
  const bookingId = metadata.bookingId;
  const businessId = (await resolveBusinessIdFromCheckoutSession(session)) || metadata.businessId;

  if (!businessId) {
    console.error('[webhook] Missing businessId (metadata + Payment Link resolution failed)');
    return;
  }

  if (session.mode === 'subscription') {
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription | null)?.id;
    if (subscriptionId) {
      await upsertStudentSubscriptionFromStripe({
        businessId,
        customerId: metadata.customerId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId:
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer as Stripe.Customer | null)?.id,
        status: 'active',
        cancelAtPeriodEnd: false,
      });
    }
    return;
  }

  const paymentLinkId =
    typeof session.payment_link === 'string'
      ? session.payment_link
      : session.payment_link && typeof session.payment_link === 'object'
        ? (session.payment_link as Stripe.PaymentLink).id
        : undefined;

  const existingBySession = await db
    .collection('businesses')
    .doc(businessId)
    .collection('payments')
    .where('stripeCheckoutSessionId', '==', session.id)
    .limit(1)
    .get();
  if (!existingBySession.empty) {
    console.log(`[webhook] Payment already recorded for session ${session.id}`);
    return;
  }

  const piId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && typeof session.payment_intent === 'object'
        ? (session.payment_intent as Stripe.PaymentIntent).id
        : null;
  if (piId) {
    const existingByPi = await db
      .collection('businesses')
      .doc(businessId)
      .collection('payments')
      .where('stripePaymentIntentId', '==', piId)
      .limit(1)
      .get();
    if (!existingByPi.empty) {
      const paymentDocId = existingByPi.docs[0].id;
      await existingByPi.docs[0].ref.update(
        stripUndefined({
          stripeCheckoutSessionId: session.id,
          updatedAt: Timestamp.now(),
          status: 'succeeded',
          succeededAt: Timestamp.now(),
          ...(paymentLinkId ? { stripePaymentLinkStripeId: paymentLinkId } : {}),
        }) as Record<string, unknown>
      );
      await markPaymentLinkPaidInFirestore(businessId, paymentLinkId, paymentDocId);
      console.log(`[webhook] Linked session ${session.id} to existing payment ${paymentDocId}`);
      return;
    }
  }

  // Create payment record
  const methodTypes = (session.payment_method_types || []) as string[];
  const paymentMethod: 'card' | 'pix' =
    methodTypes.includes('pix') ? 'pix' : 'card';

  const paymentData = stripUndefined({
    businessId,
    bookingId: bookingId || null,
    stripePaymentLinkStripeId: paymentLinkId,
    customerId: await getLinkedCustomerIdByPaymentLink(businessId, paymentLinkId),
    customerEmail: session.customer_email || session.customer_details?.email || null,
    customerName: session.customer_details?.name || null,
    amount: session.amount_total || 0,
    currency: (session.currency || 'brl').toLowerCase(),
    status: 'succeeded' as const,
    paymentMethod,
    stripePaymentIntentId: piId,
    stripeCheckoutSessionId: session.id,
    metadata: { ...metadata, source: 'stripe_checkout' } as Record<string, string>,
    description: (session as { description?: string }).description,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    succeededAt: Timestamp.now(),
  });

  const paymentRef = await db
    .collection('businesses')
    .doc(businessId)
    .collection('payments')
    .add(paymentData);

  await markPaymentLinkPaidInFirestore(businessId, paymentLinkId, paymentRef.id);

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
  let metadata = paymentIntent.metadata || {};
  let businessId = metadata.businessId;
  const bookingId = metadata.bookingId;

  if (!businessId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntent.id);
      metadata = { ...metadata, ...(pi.metadata || {}) };
      businessId = metadata.businessId || pi.metadata?.businessId;
    } catch (e) {
      console.warn('[webhook] Could not re-fetch PaymentIntent:', (e as Error)?.message);
    }
  }

  if (!businessId) {
    console.warn('[webhook] payment_intent.succeeded: missing businessId, skipping');
    return;
  }

  if (!metadata.stripePaymentLinkStripeId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntent.id);
      metadata = { ...metadata, ...(pi.metadata || {}) };
    } catch (e) {
      console.warn('[webhook] PI retrieve for metadata:', (e as Error)?.message);
    }
  }

  const paymentsRef = db.collection('businesses').doc(businessId).collection('payments');

  const byPi = await paymentsRef.where('stripePaymentIntentId', '==', paymentIntent.id).limit(1).get();
  if (!byPi.empty) {
    const paymentDoc = byPi.docs[0];
    const prev = paymentDoc.data() as { stripePaymentLinkStripeId?: string };
    const plId =
      (metadata.stripePaymentLinkStripeId as string | undefined) || prev.stripePaymentLinkStripeId;
    await paymentDoc.ref.update(
      stripUndefined({
        status: 'succeeded' as const,
        stripeChargeId:
          typeof paymentIntent.latest_charge === 'string'
            ? paymentIntent.latest_charge
            : (paymentIntent.latest_charge as Stripe.Charge | null)?.id || undefined,
        succeededAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...(metadata.stripePaymentLinkStripeId
          ? { stripePaymentLinkStripeId: metadata.stripePaymentLinkStripeId as string }
          : {}),
      })
    );
    await markPaymentLinkPaidInFirestore(businessId, plId, paymentDoc.id);
    return;
  }

  if (bookingId) {
    const paymentsQuery = await paymentsRef
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
    return;
  }

  // Payment Link / checkout without booking: create record if checkout.session.completed has not run yet
  const methodTypes = (paymentIntent.payment_method_types || []) as string[];
  const paymentMethod: 'card' | 'pix' | 'other' = methodTypes.includes('pix')
    ? 'pix'
    : methodTypes.includes('card')
      ? 'card'
      : 'other';

  const chargeId =
    typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : (paymentIntent.latest_charge as Stripe.Charge | null)?.id || undefined;

  const plFromMeta = metadata.stripePaymentLinkStripeId as string | undefined;

  const newPayment = stripUndefined({
    businessId,
    bookingId: null,
    customerId: (metadata.customerId as string | undefined) || undefined,
    customerEmail: metadata.customerEmail || undefined,
    customerName: metadata.customerName || undefined,
    amount: paymentIntent.amount_received || paymentIntent.amount,
    currency: (paymentIntent.currency || 'brl').toLowerCase(),
    status: 'succeeded' as const,
    paymentMethod,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: chargeId,
    stripePaymentLinkStripeId: plFromMeta,
    metadata: { ...metadata, source: 'stripe_payment_intent' } as Record<string, string>,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    succeededAt: Timestamp.now(),
  });

  const added = await paymentsRef.add(newPayment);
  await markPaymentLinkPaidInFirestore(businessId, plFromMeta, added.id);
  console.log(`[webhook] Payment created from payment_intent.succeeded: ${paymentIntent.id}`);
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

async function handleStudentSubscriptionUpdated(subscription: Stripe.Subscription) {
  const meta = subscription.metadata || {};
  const businessId = meta.businessId;
  if (!businessId) return;
  const customerId = meta.customerId;
  await upsertStudentSubscriptionFromStripe({
    businessId,
    customerId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : undefined,
    status: subscription.status,
    currentPeriodStart: (subscription as any).current_period_start,
    currentPeriodEnd: (subscription as any).current_period_end,
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const businessId = inv.metadata?.businessId;
  const customerId = inv.metadata?.customerId;
  const subscriptionId =
    typeof inv.subscription === 'string'
      ? inv.subscription
      : (inv.subscription as Stripe.Subscription | null)?.id;
  if (!businessId || !subscriptionId) return;

  const paymentsRef = db.collection('businesses').doc(businessId).collection('payments');
  const existing = await paymentsRef.where('stripeInvoiceId', '==', inv.id).limit(1).get();
  if (existing.empty) {
    const amountPaid = (inv.amount_paid as number | undefined) || (inv.amount_due as number | undefined) || 0;
    const paymentIntentId =
      typeof inv.payment_intent === 'string'
        ? inv.payment_intent
        : (inv.payment_intent as Stripe.PaymentIntent | null)?.id;
    await paymentsRef.add(
      stripUndefined({
        businessId,
        customerId: customerId || undefined,
        customerEmail: inv.customer_email || undefined,
        amount: amountPaid,
        currency: (inv.currency || 'brl').toLowerCase(),
        status: 'succeeded' as const,
        paymentMethod: 'card' as const,
        stripeInvoiceId: inv.id,
        stripeSubscriptionId: subscriptionId,
        stripePaymentIntentId: paymentIntentId,
        metadata: { ...(inv.metadata || {}), source: 'stripe_invoice' },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        succeededAt: Timestamp.now(),
      })
    );
  }

  await upsertStudentSubscriptionFromStripe({
    businessId,
    customerId,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: typeof inv.customer === 'string' ? inv.customer : undefined,
    status: 'active',
    cancelAtPeriodEnd: false,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const businessId = inv.metadata?.businessId;
  const customerId = inv.metadata?.customerId;
  const subscriptionId =
    typeof inv.subscription === 'string'
      ? inv.subscription
      : (inv.subscription as Stripe.Subscription | null)?.id;
  if (!businessId || !subscriptionId) return;

  const paymentsRef = db.collection('businesses').doc(businessId).collection('payments');
  const existing = await paymentsRef.where('stripeInvoiceId', '==', inv.id).limit(1).get();
  if (existing.empty) {
    const paymentIntentId =
      typeof inv.payment_intent === 'string'
        ? inv.payment_intent
        : (inv.payment_intent as Stripe.PaymentIntent | null)?.id;
    await paymentsRef.add(
      stripUndefined({
        businessId,
        customerId: customerId || undefined,
        customerEmail: inv.customer_email || undefined,
        amount: (inv.amount_due as number | undefined) || 0,
        currency: (inv.currency || 'brl').toLowerCase(),
        status: 'failed' as const,
        paymentMethod: 'card' as const,
        stripeInvoiceId: inv.id,
        stripeSubscriptionId: subscriptionId,
        stripePaymentIntentId: paymentIntentId,
        metadata: { ...(inv.metadata || {}), source: 'stripe_invoice' },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        failedAt: Timestamp.now(),
      })
    );
  }

  await upsertStudentSubscriptionFromStripe({
    businessId,
    customerId,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: typeof inv.customer === 'string' ? inv.customer : undefined,
    status: 'past_due',
    cancelAtPeriodEnd: false,
  });
}

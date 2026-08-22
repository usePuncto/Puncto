import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe/webhooks';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { sendEmail } from '@/lib/messaging/email';
import { getWelcomeEmailContent } from '@/lib/templates/welcomeEmail';
import { tierFromSubscriptionPriceId } from '@/lib/stripe/allowedPriceIds';
import { getFeaturesByTier } from '@/types/features';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = await verifyWebhookSignature(request, body);

    // Handle subscription events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
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

      default:
        console.log(`Unhandled subscription event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[subscription-webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Webhook error: ${errorMessage}` },
      { status: 400 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const businessId = session.metadata?.businessId;
  if (!businessId) {
    console.error('[subscription-webhook] Missing businessId in checkout session metadata');
    return;
  }

  const businessRef = db.collection('businesses').doc(businessId);

  // Metadata.tier is set server-side at checkout creation; subscription.* events sync from priceId
  const metadataTier = session.metadata?.tier;
  const tier =
    metadataTier === 'basic' || metadataTier === 'pro' || metadataTier === 'enterprise'
      ? metadataTier
      : null;

  const update: Record<string, unknown> = {
    'subscription.status': 'active',
    'subscription.stripeSubscriptionId': session.subscription as string,
    updatedAt: Timestamp.now(),
  };
  if (tier) {
    update['subscription.tier'] = tier;
    update.features = getFeaturesByTier(tier);
  }

  await businessRef.update(update);

  console.log(`[subscription-webhook] Business ${businessId} activated after successful payment`);

  // Send welcome email to the user
  const email =
    (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined);
  if (email) {
    try {
      const businessSnap = await businessRef.get();
      const business = businessSnap.data();
      const recipientName =
        (session.customer_details?.name as string | undefined) || business?.displayName || email.split('@')[0];
      const businessName = business?.displayName;

      const { subject, html, text } = getWelcomeEmailContent({ recipientName, businessName });

      const result = await sendEmail({ to: email, subject, html, text });
      if (result.success) {
        console.log(`[subscription-webhook] Welcome email sent to ${email}`);
      } else {
        console.error('[subscription-webhook] Failed to send welcome email:', result.error);
      }
    } catch (err) {
      console.error('[subscription-webhook] Error sending welcome email:', err);
    }
  } else {
    console.warn('[subscription-webhook] No customer email found, skipping welcome email');
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.businessId;
  if (!businessId) {
    console.error('[subscription-webhook] Missing businessId in subscription metadata');
    return;
  }

  const businessRef = db.collection('businesses').doc(businessId);
  const priceId = subscription.items.data[0]?.price.id;
  const tier = tierFromSubscriptionPriceId(priceId);
  const features = getFeaturesByTier(tier);
  const status = subscription.status === 'active' ? 'active' :
                 subscription.status === 'trialing' ? 'trial' :
                 subscription.status === 'past_due' ? 'suspended' :
                 'cancelled';

  const sub = subscription as any;
  await businessRef.update({
    'subscription.tier': tier,
    'subscription.status': status,
    'subscription.stripeSubscriptionId': subscription.id,
    'subscription.stripePriceId': priceId,
    'subscription.currentPeriodStart': Timestamp.fromMillis(sub.current_period_start * 1000),
    'subscription.currentPeriodEnd': Timestamp.fromMillis(sub.current_period_end * 1000),
    'subscription.cancelAtPeriodEnd': sub.cancel_at_period_end || false,
    features,
    updatedAt: Timestamp.now(),
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.businessId;
  if (!businessId) return;

  const businessRef = db.collection('businesses').doc(businessId);
  await businessRef.update({
    'subscription.status': 'cancelled',
    'subscription.cancelAtPeriodEnd': false,
    updatedAt: Timestamp.now(),
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const businessId = inv.metadata?.businessId;
  if (!businessId) return;

  // Update subscription status if needed
  if (inv.subscription) {
    const subscription = inv.subscription as Stripe.Subscription;
    await handleSubscriptionUpdate(subscription);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const businessId = inv.metadata?.businessId;
  if (!businessId) return;

  const businessRef = db.collection('businesses').doc(businessId);
  await businessRef.update({
    'subscription.status': 'suspended',
    updatedAt: Timestamp.now(),
  });
}

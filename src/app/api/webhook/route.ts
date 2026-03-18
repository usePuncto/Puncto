import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe/webhooks';
import Stripe from 'stripe';

// Subscription event types
const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.created',
  'invoice.finalized',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
]);

// Payment event types (excluding checkout - routed by mode)
const PAYMENT_EVENTS = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.created',
  'charge.refunded',
  'charge.succeeded',
  'product.created',
  'product.updated',
  'price.created',
  'plan.created',
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = await verifyWebhookSignature(request, body);

    const syntheticRequest = (path: string) =>
      new NextRequest(new URL(path, request.url), {
        method: 'POST',
        body,
        headers: request.headers,
      });

    // checkout.session.completed: route by mode
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription') {
        const res = await import('../subscriptions/webhook/route').then((m) =>
          m.POST(syntheticRequest('/api/subscriptions/webhook'))
        );
        return res;
      }
      if (session.mode === 'payment') {
        const res = await import('../payments/webhook/route').then((m) =>
          m.POST(syntheticRequest('/api/payments/webhook'))
        );
        return res;
      }
      return NextResponse.json({ received: true });
    }

    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      return import('../subscriptions/webhook/route').then((m) =>
        m.POST(syntheticRequest('/api/subscriptions/webhook'))
      );
    }

    if (PAYMENT_EVENTS.has(event.type)) {
      return import('../payments/webhook/route').then((m) =>
        m.POST(syntheticRequest('/api/payments/webhook'))
      );
    }

    // payment_method.attached, customer.updated, etc. - acknowledge
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

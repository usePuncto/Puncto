import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionCheckout, getOrCreateCustomer } from '@/lib/stripe/subscriptions';
import { db } from '@/lib/firebaseAdmin';
import { isAllowedCheckoutRedirectUrl } from '@/lib/payments/checkoutRedirect';
import { isAllowedSubscriptionPriceId } from '@/lib/stripe/allowedPriceIds';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata = {},
    } = body;

    if (!businessId || !priceId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isAllowedSubscriptionPriceId(priceId)) {
      return NextResponse.json(
        { error: 'Invalid or unauthorized priceId' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    if (
      !isAllowedCheckoutRedirectUrl(successUrl) ||
      !isAllowedCheckoutRedirectUrl(cancelUrl)
    ) {
      return NextResponse.json(
        { error: 'Invalid success or cancel URL' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId: string | undefined;
    if (customerEmail) {
      const customer = await getOrCreateCustomer({
        email: customerEmail,
        metadata: {
          ...metadata,
          businessId,
        },
      });
      customerId = customer.id;

      const businessRef = db.collection('businesses').doc(businessId);
      await businessRef.update({
        'subscription.stripeCustomerId': customerId,
      });
    }

    const session = await createSubscriptionCheckout({
      customerId,
      customerEmail,
      priceId,
      successUrl,
      cancelUrl,
      metadata: {
        ...metadata,
        businessId,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[create-subscription-checkout] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create subscription checkout: ${errorMessage}` },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createCustomerPortalSession } from '@/lib/stripe/subscriptions';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, returnUrl } = body;

    if (!businessId || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, returnUrl' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const customerId = authResult.business.subscription?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Business does not have a Stripe customer ID' },
        { status: 400 }
      );
    }

    const session = await createCustomerPortalSession(customerId, returnUrl);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('[create-portal-session] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create portal session: ${errorMessage}` },
      { status: 500 }
    );
  }
}

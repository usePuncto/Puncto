import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createAccountLink } from '@/lib/stripe/connect';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId } = body as { businessId?: string };

    if (!businessId) {
      return NextResponse.json({ error: 'Missing required field: businessId' }, { status: 400 });
    }

    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessSnap.data() as Record<string, unknown>;
    const stripeConnectAccountId = businessData.stripeConnectAccountId as string | undefined;
    if (!stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Este negócio ainda não possui conta Stripe Connect vinculada.' },
        { status: 400 }
      );
    }

    const account = await stripe.accounts.retrieve(stripeConnectAccountId);
    const detailsSubmitted = Boolean((account as { details_submitted?: boolean }).details_submitted);
    const chargesEnabled = Boolean((account as { charges_enabled?: boolean }).charges_enabled);
    const payoutsEnabled = Boolean((account as { payouts_enabled?: boolean }).payouts_enabled);
    const onboardingComplete = detailsSubmitted && chargesEnabled;

    await businessRef.update({
      stripeConnectDetailsSubmitted: detailsSubmitted,
      stripeConnectChargesEnabled: chargesEnabled,
      stripeConnectPayoutsEnabled: payoutsEnabled,
      stripeConnectOnboardingComplete: onboardingComplete,
      updatedAt: Timestamp.now(),
    });

    if (!onboardingComplete) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const accountLink = await createAccountLink(
        stripeConnectAccountId,
        `${baseUrl}/tenant/admin/payments?onboarding=complete`,
        `${baseUrl}/tenant/admin/payments?onboarding=refresh`
      );

      return NextResponse.json(
        {
          error: 'Stripe onboarding ainda não foi concluído.',
          onboardingRequired: true,
          onboardingUrl: accountLink.url,
          accountId: stripeConnectAccountId,
        },
        { status: 409 }
      );
    }

    const loginLink = await stripe.accounts.createLoginLink(stripeConnectAccountId);

    return NextResponse.json({
      url: (loginLink as { url?: string }).url,
      accountId: stripeConnectAccountId,
    });
  } catch (error) {
    console.error('[stripe-connect/login-link] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create login link: ${errorMessage}` },
      { status: 500 }
    );
  }
}

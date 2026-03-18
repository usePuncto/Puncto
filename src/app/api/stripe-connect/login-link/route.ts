import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { db } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, professionalId } = body as {
      businessId?: string;
      professionalId?: string;
    };

    if (!businessId || !professionalId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, professionalId' },
        { status: 400 }
      );
    }

    const professionalRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('professionals')
      .doc(professionalId);

    const professionalSnap = await professionalRef.get();
    if (!professionalSnap.exists) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
    }

    const professionalData = professionalSnap.data() as any;
    const stripeConnectAccountId = professionalData?.stripeConnectAccountId;
    if (!stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Professional does not have a Stripe Connect account' },
        { status: 400 }
      );
    }

    // Hosted Express Dashboard for this connected account.
    const loginLink = await stripe.accounts.createLoginLink(stripeConnectAccountId);

    return NextResponse.json({
      url: (loginLink as any).url,
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


import { NextRequest, NextResponse } from 'next/server';
import { createConnectAccount, createAccountLink, getAccount } from '@/lib/stripe/connect';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, email, country = 'BR' } = body as {
      businessId?: string;
      email?: string;
      country?: string;
    };

    if (!businessId) {
      return NextResponse.json({ error: 'Missing required field: businessId' }, { status: 400 });
    }

    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessSnap.data() as Record<string, unknown>;
    const connectEmail =
      (typeof email === 'string' && email.trim()) ||
      (typeof businessData.email === 'string' && businessData.email.trim()) ||
      '';
    if (!connectEmail) {
      return NextResponse.json(
        {
          error:
            'Defina o e-mail do negócio nas configurações antes de conectar o Stripe.',
        },
        { status: 400 }
      );
    }

    let existingAccountId = businessData.stripeConnectAccountId as string | undefined;
    if (!existingAccountId) {
      const ownerSnap = await businessRef
        .collection('professionals')
        .where('isOwner', '==', true)
        .limit(1)
        .get();
      const legacyId = ownerSnap.empty
        ? undefined
        : (ownerSnap.docs[0].data() as { stripeConnectAccountId?: string }).stripeConnectAccountId;
      if (legacyId) {
        existingAccountId = legacyId;
      }
    }

    const account = existingAccountId
      ? await getAccount(existingAccountId)
      : await createConnectAccount({
          email: connectEmail,
          country,
          type: 'express',
        });

    const detailsSubmitted = Boolean((account as { details_submitted?: boolean }).details_submitted);
    const chargesEnabled = Boolean((account as { charges_enabled?: boolean }).charges_enabled);
    const payoutsEnabled = Boolean((account as { payouts_enabled?: boolean }).payouts_enabled);
    const onboardingComplete = detailsSubmitted && chargesEnabled;

    await businessRef.update({
      stripeConnectAccountId: account.id,
      stripeConnectDetailsSubmitted: detailsSubmitted,
      stripeConnectChargesEnabled: chargesEnabled,
      stripeConnectPayoutsEnabled: payoutsEnabled,
      stripeConnectOnboardingComplete: onboardingComplete,
      updatedAt: Timestamp.now(),
    });

    const ownerForCleanup = await businessRef
      .collection('professionals')
      .where('isOwner', '==', true)
      .limit(1)
      .get();
    if (!ownerForCleanup.empty) {
      await ownerForCleanup.docs[0].ref.update({
        stripeConnectAccountId: FieldValue.delete(),
        stripeConnectDetailsSubmitted: FieldValue.delete(),
        stripeConnectChargesEnabled: FieldValue.delete(),
        stripeConnectPayoutsEnabled: FieldValue.delete(),
        stripeConnectOnboardingComplete: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });
    }

    if (onboardingComplete) {
      return NextResponse.json({
        accountId: account.id,
        onboardingComplete: true,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const accountLink = await createAccountLink(
      account.id,
      `${baseUrl}/tenant/admin/payments?onboarding=complete`,
      `${baseUrl}/tenant/admin/payments?onboarding=refresh`
    );

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
      onboardingComplete: false,
    });
  } catch (error) {
    console.error('[create-connect-account] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create Connect account: ${errorMessage}` },
      { status: 500 }
    );
  }
}

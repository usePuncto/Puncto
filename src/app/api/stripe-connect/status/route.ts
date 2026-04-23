import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

async function canManageStripeConnect(uid: string, businessId: string): Promise<boolean> {
  const user = await auth.getUser(uid);
  const custom = user.customClaims as
    | {
        businessRoles?: Record<string, string>;
        userType?: string;
        platformAdmin?: boolean;
      }
    | undefined;

  if (custom?.userType === 'platform_admin' && custom?.platformAdmin === true) return true;

  const role = custom?.businessRoles?.[businessId];
  if (role === 'owner' || role === 'manager') return true;

  const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').doc(uid).get();
  const perms = staffSnap.data()?.permissions as Record<string, boolean> | undefined;
  return Boolean(perms?.manageBookings);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await request.json();
    const { businessId } = body as { businessId?: string };

    if (!businessId) {
      return NextResponse.json({ error: 'Missing required field: businessId' }, { status: 400 });
    }

    const allowed = await canManageStripeConnect(uid, businessId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
        { error: 'Este negocio ainda nao possui conta Stripe Connect vinculada.' },
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

    return NextResponse.json({
      accountId: stripeConnectAccountId,
      onboardingComplete,
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
    });
  } catch (error) {
    console.error('[stripe-connect/status] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to sync connect account status: ${errorMessage}` },
      { status: 500 }
    );
  }
}

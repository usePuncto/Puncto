import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import {
  describeBoletoCapabilityStatus,
  getBoletoPaymentsCapabilityStatus,
  getConnectedAccountBoletoPmcStatus,
} from '@/lib/stripe/boletoConnect';
import { STRIPE_CONNECT_ACCOUNT_INVALID_MESSAGE, isStripeConnectAccountInvalidError } from '@/lib/stripe/connectErrors';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId } = body as { businessId?: string };

    if (!businessId) {
      return NextResponse.json({ error: 'Missing required field: businessId' }, { status: 400 });
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
      anyPermission: ['manageBookings'],
    });
    if (authError(authResult)) return authResult.error;

    const businessRef = db.collection('businesses').doc(businessId);
    const businessData = authResult.business as unknown as Record<string, unknown>;
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

    const boletoPayments = getBoletoPaymentsCapabilityStatus(account);
    const boletoPmc = await getConnectedAccountBoletoPmcStatus(stripeConnectAccountId);

    const capabilities = account.capabilities ?? {};

    return NextResponse.json({
      accountId: stripeConnectAccountId,
      platformNote:
        'Cobranças usam a conta conectada abaixo, não a conta da plataforma Puncto. Boleto exige capabilities.boleto_payments = active nesta conta (GET /v1/accounts/{id}).',
      onboardingComplete,
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
      country: account.country || null,
      capabilities: {
        boleto_payments: capabilities.boleto_payments ?? null,
        card_payments: capabilities.card_payments ?? null,
        transfers: capabilities.transfers ?? null,
      },
      boletoPayments,
      boletoCapabilityHint: describeBoletoCapabilityStatus(boletoPayments, stripeConnectAccountId),
      boletoPmcConfigId: boletoPmc.configId,
      boletoPmcAvailable: boletoPmc.boletoAvailable,
      boletoPmcDisplayPreference: boletoPmc.boletoDisplayPreference ?? null,
      boletoReady:
        boletoPayments === 'active' &&
        boletoPmc.boletoAvailable &&
        Boolean(account.charges_enabled),
    });
  } catch (error) {
    console.error('[stripe-connect/status] Error:', error);
    if (isStripeConnectAccountInvalidError(error)) {
      return NextResponse.json({ error: STRIPE_CONNECT_ACCOUNT_INVALID_MESSAGE }, { status: 403 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to sync connect account status: ${errorMessage}` },
      { status: 500 }
    );
  }
}

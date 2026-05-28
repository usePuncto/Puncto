import { stripe } from '@/lib/stripe/client';
import type Stripe from 'stripe';

export type BoletoCapabilityStatus = 'active' | 'pending' | 'inactive' | 'unrequested';

export function getBoletoPaymentsCapabilityStatus(account: Stripe.Account): BoletoCapabilityStatus {
  const status = account.capabilities?.boleto_payments;
  if (status === 'active') return 'active';
  if (status === 'pending' || status === 'inactive') return status;
  return 'unrequested';
}

/** Solicita a capability boleto_payments na conta Connect (Express/Custom). */
export async function requestBoletoPaymentsCapability(stripeAccountId: string) {
  return stripe.accounts.update(stripeAccountId, {
    capabilities: {
      boleto_payments: { requested: true },
    },
  });
}

export async function ensureBoletoReadyForConnectedAccount(stripeAccountId: string): Promise<{
  ok: true;
  status: BoletoCapabilityStatus;
}> {
  let account = await stripe.accounts.retrieve(stripeAccountId);
  let status = getBoletoPaymentsCapabilityStatus(account);

  if (status !== 'active') {
    try {
      account = await requestBoletoPaymentsCapability(stripeAccountId);
      status = getBoletoPaymentsCapabilityStatus(account);
    } catch (e) {
      console.warn('[boleto] Could not request boleto_payments capability:', (e as Error)?.message);
    }
  }

  const country = (account.country || '').toUpperCase();
  if (country !== 'BR') {
    throw new Error(
      `A conta conectada (${stripeAccountId}) está no país ${country || 'desconhecido'}. ` +
        'Boleto exige conta Stripe no Brasil (BR).'
    );
  }

  if (!account.charges_enabled) {
    throw new Error(
      'A conta conectada ainda não está habilitada para cobranças. Finalize o onboarding Stripe Connect e tente novamente.'
    );
  }

  return { ok: true, status };
}

/** Checkout Session com somente boleto (recomendado pela Stripe para Connect; Payment Link costuma falhar). */
export async function createBoletoCheckoutSession(
  params: {
    name: string;
    description?: string;
    amount: number;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  },
  stripeAccount: string
) {
  const sessionBase: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: params.name,
            description: params.description,
          },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    payment_method_types: ['boleto'],
    payment_method_options: {
      boleto: { expires_after_days: 3 },
    },
  };

  return stripe.checkout.sessions.create(sessionBase, { stripeAccount });
}

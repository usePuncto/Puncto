import { stripe } from './client';

export interface CreateConnectAccountParams {
  email: string;
  country?: string;
  type?: 'express' | 'standard';
}

/**
 * Create a Stripe Connect Express account for a professional
 */
export async function createConnectAccount(params: CreateConnectAccountParams) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: params.country || 'BR',
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      boleto_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return account;
}

/**
 * Create an account link for onboarding
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  });

  return accountLink;
}

/**
 * Create a transfer to a Connect account
 */
export async function createTransfer(params: {
  amount: number; // Amount in cents
  currency: string;
  destination: string; // Stripe Connect account ID
  transferGroup?: string;
  metadata?: Record<string, string>;
}) {
  const transfer = await stripe.transfers.create({
    amount: params.amount,
    currency: params.currency.toLowerCase(),
    destination: params.destination,
    transfer_group: params.transferGroup,
    metadata: params.metadata,
  });

  return transfer;
}

/**
 * Get account details
 */
export async function getAccount(accountId: string) {
  return await stripe.accounts.retrieve(accountId);
}

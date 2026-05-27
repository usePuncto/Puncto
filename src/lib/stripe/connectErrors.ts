import type Stripe from 'stripe';

export function isStripeConnectAccountInvalidError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as Stripe.errors.StripeError & {
    code?: string;
    raw?: { code?: string };
  };
  return err.code === 'account_invalid' || err.raw?.code === 'account_invalid';
}

export const STRIPE_CONNECT_ACCOUNT_INVALID_MESSAGE =
  'A conta Stripe Connect deste negócio não está acessível com a chave da plataforma configurada no servidor. ' +
  'Isso costuma ocorrer quando a STRIPE_SECRET_KEY foi trocada ou a conexão foi revogada. ' +
  'Vá em Pagamentos e clique em "Conectar Stripe" novamente (ou use a mesma chave secreta da conta que criou a conexão).';

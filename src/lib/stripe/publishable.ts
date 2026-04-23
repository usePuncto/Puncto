/**
 * Stripe.js / Elements no browser — só usa NEXT_PUBLIC_*.
 * Não importe `@/lib/stripe/client` em Client Components (ele inicializa o SDK com STRIPE_SECRET_KEY).
 */
export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
  }
  return key;
}

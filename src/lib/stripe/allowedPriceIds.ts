/**
 * Platform SaaS subscription Price IDs allowed for checkout.
 * Never accept arbitrary client priceIds against the platform Stripe account.
 */
export function getAllowedSubscriptionPriceIds(): Set<string> {
  const ids = [
    process.env.STRIPE_PRICE_ID_STARTER,
    process.env.STRIPE_PRICE_ID_STARTER_ANNUAL,
    process.env.STRIPE_PRICE_ID_GROWTH,
    process.env.STRIPE_PRICE_ID_GROWTH_ANNUAL,
    process.env.STRIPE_PRICE_ID_PRO,
    process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
  ]
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0);

  return new Set(ids);
}

export function isAllowedSubscriptionPriceId(priceId: string): boolean {
  if (!priceId || typeof priceId !== 'string') return false;
  const allowed = getAllowedSubscriptionPriceIds();
  if (allowed.size === 0) return false;
  return allowed.has(priceId.trim());
}

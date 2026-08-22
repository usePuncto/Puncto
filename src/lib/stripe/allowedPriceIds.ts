import type { SubscriptionTier } from '@/types/features';

export type PaidPlanId = 'starter' | 'growth' | 'pro';
export type BillingPeriod = 'monthly' | 'annual';

const PAID_PLANS: readonly PaidPlanId[] = ['starter', 'growth', 'pro'];

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

export function isPaidPlanId(plan: unknown): plan is PaidPlanId {
  return typeof plan === 'string' && (PAID_PLANS as readonly string[]).includes(plan);
}

/**
 * Resolve Stripe Price ID from plan + billing period only (server env).
 * Never trust a client-supplied priceId.
 */
export function resolveSubscriptionPriceId(
  plan: PaidPlanId,
  billingPeriod: BillingPeriod = 'monthly'
): string | null {
  const isAnnual = billingPeriod === 'annual';
  const map: Record<PaidPlanId, string> = isAnnual
    ? {
        starter:
          process.env.STRIPE_PRICE_ID_STARTER_ANNUAL ||
          process.env.STRIPE_PRICE_ID_STARTER ||
          '',
        growth:
          process.env.STRIPE_PRICE_ID_GROWTH_ANNUAL ||
          process.env.STRIPE_PRICE_ID_GROWTH ||
          '',
        pro:
          process.env.STRIPE_PRICE_ID_PRO_ANNUAL || process.env.STRIPE_PRICE_ID_PRO || '',
      }
    : {
        starter: process.env.STRIPE_PRICE_ID_STARTER || '',
        growth: process.env.STRIPE_PRICE_ID_GROWTH || '',
        pro: process.env.STRIPE_PRICE_ID_PRO || '',
      };

  const priceId = (map[plan] || '').trim();
  if (!priceId || !isAllowedSubscriptionPriceId(priceId)) return null;
  return priceId;
}

/** Marketing plan id → internal subscription tier (must match Stripe price mapping). */
export function tierFromPaidPlanId(plan: PaidPlanId): SubscriptionTier {
  const map: Record<PaidPlanId, SubscriptionTier> = {
    starter: 'basic',
    growth: 'pro',
    pro: 'enterprise',
  };
  return map[plan];
}

/** Paid Stripe Price ID → internal subscription tier. Unknown/empty → free. */
export function tierFromSubscriptionPriceId(priceId: string | null | undefined): SubscriptionTier {
  if (!priceId || !isAllowedSubscriptionPriceId(priceId)) return 'free';

  const normalized = priceId.trim();
  const pairs: Array<{ env: string | undefined; tier: SubscriptionTier }> = [
    { env: process.env.STRIPE_PRICE_ID_STARTER, tier: 'basic' },
    { env: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL, tier: 'basic' },
    { env: process.env.STRIPE_PRICE_ID_GROWTH, tier: 'pro' },
    { env: process.env.STRIPE_PRICE_ID_GROWTH_ANNUAL, tier: 'pro' },
    { env: process.env.STRIPE_PRICE_ID_PRO, tier: 'enterprise' },
    { env: process.env.STRIPE_PRICE_ID_PRO_ANNUAL, tier: 'enterprise' },
  ];

  for (const { env, tier } of pairs) {
    if (env && env.trim() === normalized) return tier;
  }
  return 'free';
}

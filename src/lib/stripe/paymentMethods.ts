import type { PaymentMethod } from '@/types/payment';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';

/** Cartão + Pix em links de pagamento padrão. */
export const BRL_STANDARD_PAYMENT_LINK_TYPES = ['card', 'pix'] as const;

/** Checkout de agendamento (sem boleto — boleto tem fluxo próprio). */
export const BRL_CHECKOUT_PAYMENT_METHOD_TYPES = ['card', 'pix'] as const;

/** Somente boleto em links dedicados. */
export const BOLETO_PAYMENT_LINK_TYPES = ['boleto'] as const;

export type StripeCheckoutPaymentMethodType =
  | (typeof BRL_CHECKOUT_PAYMENT_METHOD_TYPES)[number]
  | (typeof BOLETO_PAYMENT_LINK_TYPES)[number];

export function resolvePaymentMethodFromTypes(
  methodTypes: string[],
  selectedType?: string | null
): PaymentMethod {
  const type = selectedType || undefined;
  if (type === 'pix' || (!type && methodTypes.length === 1 && methodTypes[0] === 'pix')) return 'pix';
  if (type === 'boleto' || (!type && methodTypes.length === 1 && methodTypes[0] === 'boleto')) {
    return 'boleto';
  }
  if (type === 'card' || methodTypes.includes('card')) return 'card';
  if (methodTypes.includes('pix')) return 'pix';
  if (methodTypes.includes('boleto')) return 'boleto';
  return 'other';
}

const ALL_KNOWN_METHODS = [
  ...BRL_STANDARD_PAYMENT_LINK_TYPES,
  ...BOLETO_PAYMENT_LINK_TYPES,
] as const;

export function parseInvalidPaymentMethodType(message: string): string | null {
  const lower = message.toLowerCase();
  for (const method of ALL_KNOWN_METHODS) {
    if (lower.includes(method) && (lower.includes('invalid') || lower.includes('not enabled'))) {
      return method;
    }
  }
  return null;
}

/**
 * Creates a Stripe Payment Link, dropping unsupported methods when needed.
 */
export async function createStripePaymentLinkWithMethods(
  params: Omit<Stripe.PaymentLinkCreateParams, 'payment_method_types'> & {
    payment_method_types?: string[];
  },
  stripeAccount: string,
  preferredMethods: readonly string[]
): Promise<Stripe.PaymentLink> {
  let methods: string[] = [...preferredMethods];

  while (methods.length > 0) {
    try {
      return await stripe.paymentLinks.create(
        {
          ...params,
          payment_method_types: methods as Stripe.PaymentLinkCreateParams['payment_method_types'],
        },
        { stripeAccount }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const invalid = parseInvalidPaymentMethodType(message);
      if (invalid && methods.includes(invalid)) {
        console.warn(`[stripe] Payment method "${invalid}" unavailable; retrying without it.`);
        methods = methods.filter((m) => m !== invalid);
        continue;
      }
      throw err;
    }
  }

  return stripe.paymentLinks.create(
    { ...params, payment_method_types: ['card'] },
    { stripeAccount }
  );
}

/** @deprecated Use createStripePaymentLinkWithMethods with BRL_STANDARD_PAYMENT_LINK_TYPES */
export async function createStripePaymentLinkWithBrlMethods(
  params: Omit<Stripe.PaymentLinkCreateParams, 'payment_method_types'> & {
    payment_method_types?: string[];
  },
  stripeAccount: string
): Promise<Stripe.PaymentLink> {
  return createStripePaymentLinkWithMethods(params, stripeAccount, BRL_STANDARD_PAYMENT_LINK_TYPES);
}

export async function resolvePaymentMethodFromCheckoutSession(
  session: Stripe.Checkout.Session,
  stripeAccount?: string
): Promise<PaymentMethod> {
  const piId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && typeof session.payment_intent === 'object'
        ? session.payment_intent.id
        : null;

  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(
        piId,
        { expand: ['payment_method'] },
        stripeAccount ? { stripeAccount } : undefined
      );
      const pm = pi.payment_method;
      const pmType = typeof pm === 'object' && pm && 'type' in pm ? pm.type : undefined;
      if (pmType) {
        return resolvePaymentMethodFromTypes([], pmType);
      }
    } catch (e) {
      console.warn('[stripe] Could not resolve payment method from PI:', (e as Error)?.message);
    }
  }

  const methodTypes = (session.payment_method_types || []) as string[];
  if (session.payment_status === 'unpaid' && methodTypes.includes('boleto')) {
    return 'boleto';
  }
  return resolvePaymentMethodFromTypes(methodTypes);
}

export async function createCheckoutSessionWithBrlMethods(
  params: Omit<Stripe.Checkout.SessionCreateParams, 'payment_method_types'> & {
    payment_method_types?: string[];
  },
  requestOptions?: Stripe.RequestOptions
): Promise<Stripe.Checkout.Session> {
  let methods: string[] = [...BRL_CHECKOUT_PAYMENT_METHOD_TYPES];

  while (methods.length > 0) {
    try {
      return await stripe.checkout.sessions.create(
        { ...params, payment_method_types: methods as Stripe.Checkout.SessionCreateParams['payment_method_types'] },
        requestOptions
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const invalid = parseInvalidPaymentMethodType(message);
      if (invalid && methods.includes(invalid)) {
        console.warn(`[stripe] Checkout: "${invalid}" unavailable; retrying without it.`);
        methods = methods.filter((m) => m !== invalid);
        continue;
      }
      throw err;
    }
  }

  return stripe.checkout.sessions.create(
    { ...params, payment_method_types: ['card'] },
    requestOptions
  );
}

export async function resolvePaymentMethodFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  stripeAccount?: string
): Promise<PaymentMethod> {
  const pm = paymentIntent.payment_method;
  if (typeof pm === 'object' && pm && 'type' in pm) {
    return resolvePaymentMethodFromTypes([], pm.type);
  }
  if (typeof pm === 'string') {
    try {
      const retrieved = await stripe.paymentMethods.retrieve(
        pm,
        stripeAccount ? { stripeAccount } : undefined
      );
      return resolvePaymentMethodFromTypes([], retrieved.type);
    } catch {
      // fall through
    }
  }
  const methodTypes = (paymentIntent.payment_method_types || []) as string[];
  return resolvePaymentMethodFromTypes(methodTypes);
}

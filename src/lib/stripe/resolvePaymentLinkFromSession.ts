import { db } from '@/lib/firebaseAdmin';
import type Stripe from 'stripe';

/** Resolve o id Stripe salvo em paymentLinks (pl_ ou cs_) para marcar cobrança como paga. */
export async function resolvePaymentLinkStripeIdForSession(
  businessId: string,
  session: Stripe.Checkout.Session
): Promise<string | undefined> {
  const fromPaymentLink =
    typeof session.payment_link === 'string'
      ? session.payment_link
      : session.payment_link && typeof session.payment_link === 'object'
        ? session.payment_link.id
        : undefined;
  if (fromPaymentLink) return fromPaymentLink;

  const metaId = session.metadata?.stripePaymentLinkStripeId;
  if (typeof metaId === 'string' && metaId) return metaId;

  const bySession = await db
    .collection('businesses')
    .doc(businessId)
    .collection('paymentLinks')
    .where('stripeCheckoutSessionId', '==', session.id)
    .limit(1)
    .get();
  if (!bySession.empty) {
    const data = bySession.docs[0].data() as { stripePaymentLinkId?: string };
    return data.stripePaymentLinkId || session.id;
  }

  const byStoredId = await db
    .collection('businesses')
    .doc(businessId)
    .collection('paymentLinks')
    .where('stripePaymentLinkId', '==', session.id)
    .limit(1)
    .get();
  if (!byStoredId.empty) {
    return session.id;
  }

  return undefined;
}

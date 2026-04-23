import { db } from '@/lib/firebaseAdmin';
import { stripe } from '@/lib/stripe/client';
import { Timestamp, type CollectionReference, type QuerySnapshot } from 'firebase-admin/firestore';
import type Stripe from 'stripe';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Record<string, unknown>;
}

/** Remove linhas só com valor/PI criadas antes do registro canônico da fatura. */
async function removeOrphanTuitionPaymentCopies(
  paymentsRef: CollectionReference,
  canonicalInvoiceId: string,
  opts: { paymentIntentId?: string; stripeChargeId?: string },
) {
  const { paymentIntentId, stripeChargeId } = opts;
  try {
    const maybeDelete = async (snap: QuerySnapshot) => {
      for (const d of snap.docs) {
        const data = d.data() as { stripeInvoiceId?: string };
        if (data.stripeInvoiceId === canonicalInvoiceId) continue;
        if (!data.stripeInvoiceId) await d.ref.delete();
      }
    };
    if (paymentIntentId) {
      const snap = await paymentsRef.where('stripePaymentIntentId', '==', paymentIntentId).get();
      await maybeDelete(snap);
    }
    if (stripeChargeId) {
      const snap = await paymentsRef.where('stripeChargeId', '==', stripeChargeId).get();
      await maybeDelete(snap);
    }
  } catch (e) {
    console.warn('[tuitionInvoicePaymentRecord] removeOrphanTuitionPaymentCopies', e);
  }
}

function tuitionPaymentRowScore(data: Record<string, unknown>): number {
  let n = 0;
  if (data.customerId) n += 4;
  if (data.customerName) n += 2;
  if (data.customerEmail) n += 1;
  if (data.tuitionTypeName) n += 2;
  if (data.description) n += 1;
  if (data.stripeInvoiceId) n += 2;
  if (data.stripePaymentIntentId) n += 1;
  return n;
}

async function getStudentSubscriptionFirestoreData(
  businessId: string,
  stripeSubscriptionId: string,
): Promise<Record<string, unknown> | null> {
  const col = db.collection('businesses').doc(businessId).collection('studentSubscriptions');
  const byDoc = await col.doc(stripeSubscriptionId).get();
  if (byDoc.exists) return byDoc.data() as Record<string, unknown>;
  const q = await col.where('stripeSubscriptionId', '==', stripeSubscriptionId).limit(1).get();
  if (!q.empty) return q.docs[0].data() as Record<string, unknown>;
  return null;
}

/**
 * Garante uma linha em `businesses/{businessId}/payments` para fatura de mensalidade (Connect).
 * Idempotente por `stripeInvoiceId`. Enriquece cliente/tipo via Firestore e, se faltar, via metadata da subscription no Stripe.
 */
export async function recordTuitionInvoicePaymentForConnect(params: {
  businessId: string;
  invoice: Stripe.Invoice;
  stripeSubscriptionId: string;
  stripeAccount: string;
}): Promise<'created' | 'duplicate' | 'skipped'> {
  const { businessId, invoice, stripeSubscriptionId, stripeAccount } = params;

  const paymentsRef = db.collection('businesses').doc(businessId).collection('payments');

  let inv = invoice as Stripe.Invoice & {
    payment_intent?: string | Stripe.PaymentIntent | null;
    customer_email?: string | null;
    amount_paid?: number;
    amount_due?: number;
    total?: number;
  };

  const needsInvoiceRefresh =
    (typeof inv.amount_paid !== 'number' || inv.amount_paid <= 0) &&
    (typeof inv.total !== 'number' || inv.total <= 0) &&
    (typeof inv.amount_due !== 'number' || inv.amount_due <= 0);
  if (needsInvoiceRefresh) {
    try {
      inv = (await stripe.invoices.retrieve(inv.id, { expand: ['payment_intent'] }, { stripeAccount })) as typeof inv;
    } catch (e) {
      console.warn('[tuitionInvoicePaymentRecord] invoice.retrieve (valores)', inv.id, e);
    }
  }

  const subData = await getStudentSubscriptionFirestoreData(businessId, stripeSubscriptionId);
  let customerId = typeof subData?.customerId === 'string' ? subData.customerId : undefined;
  let tuitionTypeId = typeof subData?.tuitionTypeId === 'string' ? subData.tuitionTypeId : undefined;
  let tuitionTypeName = typeof subData?.tuitionTypeName === 'string' ? subData.tuitionTypeName : undefined;

  if (!customerId || !tuitionTypeId) {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {}, { stripeAccount });
      const meta = sub.metadata || {};
      if (!customerId && typeof meta.customerId === 'string') customerId = meta.customerId;
      if (!tuitionTypeId && typeof meta.tuitionTypeId === 'string') tuitionTypeId = meta.tuitionTypeId;
      if (!tuitionTypeName && typeof meta.tuitionTypeName === 'string') tuitionTypeName = meta.tuitionTypeName;
    } catch (e) {
      console.warn('[tuitionInvoicePaymentRecord] subscription.retrieve', stripeSubscriptionId, e);
    }
  }

  if (tuitionTypeId && !tuitionTypeName) {
    try {
      const ttSnap = await db.collection('businesses').doc(businessId).collection('tuitionTypes').doc(tuitionTypeId).get();
      if (ttSnap.exists) {
        const t = ttSnap.data() as { name?: string };
        if (typeof t.name === 'string' && t.name.trim()) tuitionTypeName = t.name.trim();
      }
    } catch {
      /* ignore */
    }
  }

  let customerName: string | undefined;
  let customerEmail: string | undefined;
  if (customerId) {
    const custSnap = await db.collection('businesses').doc(businessId).collection('customers').doc(customerId).get();
    if (custSnap.exists) {
      const d = custSnap.data() as { firstName?: string; lastName?: string; email?: string };
      customerName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || undefined;
      customerEmail = d.email || undefined;
    }
  }

  let paymentIntentId: string | undefined;
  const pi0 = inv.payment_intent;
  paymentIntentId =
    typeof pi0 === 'string' ? pi0 : pi0 && typeof pi0 === 'object' && 'id' in pi0 ? (pi0 as Stripe.PaymentIntent).id : undefined;

  if (!paymentIntentId) {
    try {
      inv = (await stripe.invoices.retrieve(inv.id, { expand: ['payment_intent'] }, { stripeAccount })) as typeof inv;
      const pi1 = inv.payment_intent;
      paymentIntentId =
        typeof pi1 === 'string' ? pi1 : pi1 && typeof pi1 === 'object' && 'id' in pi1 ? (pi1 as Stripe.PaymentIntent).id : undefined;
    } catch (e) {
      console.warn('[tuitionInvoicePaymentRecord] invoice.retrieve (pi)', inv.id, e);
    }
  }

  let stripeChargeId: string | undefined;
  const chField = (inv as Stripe.Invoice & { charge?: string | Stripe.Charge | null }).charge;
  stripeChargeId =
    typeof chField === 'string'
      ? chField
      : chField && typeof chField === 'object' && 'id' in chField
        ? (chField as Stripe.Charge).id
        : undefined;

  if (!stripeChargeId && paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount });
      const lc = pi.latest_charge;
      stripeChargeId =
        typeof lc === 'string' ? lc : lc && typeof lc === 'object' && 'id' in lc ? (lc as Stripe.Charge).id : undefined;
    } catch (e) {
      console.warn('[tuitionInvoicePaymentRecord] PI latest_charge', e);
    }
  }

  const amountPaid =
    typeof inv.amount_paid === 'number' && inv.amount_paid > 0
      ? inv.amount_paid
      : typeof inv.amount_due === 'number' && inv.amount_due > 0
        ? inv.amount_due
        : typeof inv.total === 'number' && inv.total > 0
          ? inv.total
          : 0;

  if (amountPaid <= 0) {
    console.warn('[tuitionInvoicePaymentRecord] invoice sem valor > 0, ignorado', inv.id);
    return 'skipped';
  }

  const description = tuitionTypeName ? `Mensalidade — ${tuitionTypeName}` : 'Mensalidade escolar';

  const payload = stripUndefined({
    businessId,
    customerId,
    customerName,
    customerEmail: customerEmail || (typeof inv.customer_email === 'string' ? inv.customer_email : undefined),
    amount: amountPaid,
    currency: (inv.currency || 'brl').toLowerCase(),
    status: 'succeeded',
    paymentMethod: 'card',
    stripeInvoiceId: inv.id,
    stripeSubscriptionId,
    stripePaymentIntentId: paymentIntentId,
    stripeChargeId,
    tuitionTypeId,
    tuitionTypeName,
    description,
    metadata: {
      source: 'stripe_invoice_tuition',
      ...(tuitionTypeId ? { tuitionTypeId } : {}),
      ...(tuitionTypeName ? { tuitionTypeName } : {}),
    },
    updatedAt: Timestamp.now(),
    succeededAt: Timestamp.now(),
  });

  const now = Timestamp.now();

  const finish = async (out: 'created' | 'duplicate') => {
    await removeOrphanTuitionPaymentCopies(paymentsRef, inv.id, {
      paymentIntentId,
      stripeChargeId,
    });
    return out;
  };

  const legacySnap = await paymentsRef.where('stripeInvoiceId', '==', inv.id).limit(25).get();
  if (!legacySnap.empty) {
    let best = legacySnap.docs[0];
    let bestScore = tuitionPaymentRowScore(best.data() as Record<string, unknown>);
    for (const d of legacySnap.docs.slice(1)) {
      const s = tuitionPaymentRowScore(d.data() as Record<string, unknown>);
      if (s > bestScore) {
        best = d;
        bestScore = s;
      }
    }
    await best.ref.set({ ...payload, updatedAt: now, succeededAt: now }, { merge: true });
    return finish('duplicate');
  }

  const canonicalRef = paymentsRef.doc(inv.id);
  const canonicalSnap = await canonicalRef.get();
  if (canonicalSnap.exists) {
    await canonicalRef.set(
      {
        ...payload,
        updatedAt: now,
        succeededAt: now,
      },
      { merge: true },
    );
    return finish('duplicate');
  }

  await canonicalRef.set(
    {
      ...payload,
      createdAt: now,
      updatedAt: now,
      succeededAt: now,
    },
    { merge: true },
  );

  return finish('created');
}

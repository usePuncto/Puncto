import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { recordTuitionInvoicePaymentForConnect } from '@/lib/server/tuitionInvoicePaymentRecord';
import { stripe } from '@/lib/stripe/client';
import { Timestamp } from 'firebase-admin/firestore';
import type Stripe from 'stripe';

type Action = 'create' | 'cancel' | 'portal' | 'prepare_incomplete_payment' | 'sync_from_stripe';

/** Campos legados / expand — tipos Stripe nem sempre expõem payment_intent no Invoice raiz. */
type InvoiceWithPaymentIntent = Stripe.Invoice & {
  payment_intent?: string | Stripe.PaymentIntent | null;
};

async function getActor(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return auth.verifyIdToken(token);
}

async function canManageByStaff(uid: string, businessId: string) {
  const user = await auth.getUser(uid);
  const claims = user.customClaims as { businessRoles?: Record<string, string>; userType?: string; platformAdmin?: boolean } | undefined;
  if (claims?.userType === 'platform_admin' && claims.platformAdmin === true) return true;
  const role = claims?.businessRoles?.[businessId];
  if (role === 'owner' || role === 'manager') return true;
  const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').doc(uid).get();
  return Boolean((staffSnap.data()?.permissions as Record<string, boolean> | undefined)?.manageBookings);
}

/**
 * Expansões a partir do objeto Invoice (máx. 4 níveis na API Stripe).
 * Não usar `payments.data.payment.payment_intent` aqui — no subscription vira
 * `latest_invoice.payments...` e passa de 4 níveis (erro property_expansion_max_depth).
 */
const INVOICE_PAYMENT_EXPAND: string[] = [
  'payment_intent',
  'confirmation_secret',
  'payments.data.payment',
];

function clientSecretFromInvoiceSync(invoice: Stripe.Invoice): string | null {
  const conf = invoice.confirmation_secret;
  if (conf && typeof conf === 'object' && typeof conf.client_secret === 'string' && conf.client_secret) {
    return conf.client_secret;
  }

  const pi = (invoice as InvoiceWithPaymentIntent).payment_intent;
  if (pi && typeof pi === 'object' && pi.client_secret) return pi.client_secret;

  const list = invoice.payments?.data;
  if (Array.isArray(list)) {
    const sorted = [...list].sort((a, b) => Number(b?.is_default) - Number(a?.is_default));
    for (const ip of sorted) {
      const pay = ip?.payment;
      if (pay?.type === 'payment_intent' && pay.payment_intent && typeof pay.payment_intent === 'object') {
        const p = pay.payment_intent as Stripe.PaymentIntent;
        if (p.client_secret) return p.client_secret;
      }
    }
  }

  return null;
}

async function clientSecretFromInvoiceAsync(
  invoice: Stripe.Invoice,
  stripeAccount: string,
): Promise<string | null> {
  const sync = clientSecretFromInvoiceSync(invoice);
  if (sync) return sync;

  const pi = (invoice as InvoiceWithPaymentIntent).payment_intent;
  if (typeof pi === 'string') {
    const retrieved = await stripe.paymentIntents.retrieve(pi, {}, { stripeAccount });
    return retrieved.client_secret ?? null;
  }

  const list = invoice.payments?.data;
  if (Array.isArray(list)) {
    for (const ip of list) {
      const pay = ip?.payment;
      if (pay?.type === 'payment_intent' && typeof pay.payment_intent === 'string') {
        const retrieved = await stripe.paymentIntents.retrieve(pay.payment_intent, {}, { stripeAccount });
        if (retrieved.client_secret) return retrieved.client_secret;
      }
    }
  }

  return null;
}

async function retrieveInvoiceReadyForPayment(
  invoiceId: string,
  stripeAccount: string,
): Promise<Stripe.Invoice> {
  let inv = await stripe.invoices.retrieve(invoiceId, { expand: INVOICE_PAYMENT_EXPAND }, { stripeAccount });
  if (inv.status === 'draft') {
    inv = await stripe.invoices.finalizeInvoice(
      invoiceId,
      { auto_advance: true, expand: INVOICE_PAYMENT_EXPAND },
      { stripeAccount },
    );
  }
  return inv;
}

function getClientSecretFromSubscription(subscription: Stripe.Subscription): string | null {
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === 'string') return null;
  return clientSecretFromInvoiceSync(invoice as Stripe.Invoice);
}

/**
 * Connect + API recente: latest_invoice pode vir só como id; payment_intent pode estar vazio até expand;
 * client_secret pode estar em confirmation_secret ou em InvoicePayment.
 */
async function resolveSubscriptionInitialPaymentClientSecret(
  subscription: Stripe.Subscription,
  stripeAccount: string,
): Promise<string | null> {
  const fromExpand = getClientSecretFromSubscription(subscription);
  if (fromExpand) return fromExpand;

  const invRef = subscription.latest_invoice;
  const invoiceId =
    typeof invRef === 'string'
      ? invRef
      : invRef && typeof invRef === 'object' && 'id' in invRef
        ? (invRef as Stripe.Invoice).id
        : null;
  if (!invoiceId) {
    console.error('[students/subscriptions/manage] subscription sem latest_invoice:', subscription.id);
    return null;
  }

  try {
    const inv = await retrieveInvoiceReadyForPayment(invoiceId, stripeAccount);
    const secret = await clientSecretFromInvoiceAsync(inv, stripeAccount);
    if (secret) return secret;
    console.error('[students/subscriptions/manage] invoice sem client_secret', {
      invoiceId: inv.id,
      status: inv.status,
      amount_due: inv.amount_due,
      collection_method: inv.collection_method,
      billing_reason: inv.billing_reason,
    });
  } catch (e) {
    console.error('[students/subscriptions/manage] invoice retrieve/finalize:', invoiceId, e);
  }

  try {
    const sub2 = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['latest_invoice.confirmation_secret', 'latest_invoice.payment_intent'],
    }, { stripeAccount });
    const again = getClientSecretFromSubscription(sub2);
    if (again) return again;
    const li = sub2.latest_invoice;
    const id2 = typeof li === 'string' ? li : (li as Stripe.Invoice | null)?.id ?? null;
    if (id2) {
      const inv2 = await retrieveInvoiceReadyForPayment(id2, stripeAccount);
      return clientSecretFromInvoiceAsync(inv2, stripeAccount);
    }
  } catch (e) {
    console.error('[students/subscriptions/manage] re-fetch subscription:', subscription.id, e);
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as {
      action?: Action;
      businessId?: string;
      customerId?: string;
      amount?: number;
      currency?: string;
      subscriptionId?: string;
      successUrl?: string;
      cancelUrl?: string;
      tuitionTypeId?: string;
    };
    const { action, businessId } = body;
    if (!action || !businessId) {
      return NextResponse.json({ error: 'action e businessId sao obrigatorios' }, { status: 400 });
    }

    const businessSnap = await db.collection('businesses').doc(businessId).get();
    const businessData = businessSnap.data() as { stripeConnectAccountId?: string; industry?: string } | undefined;
    if (businessData?.industry !== 'education') {
      return NextResponse.json({ error: 'Mensalidade disponivel apenas para education' }, { status: 400 });
    }
    const stripeAccount = businessData?.stripeConnectAccountId;
    if (!stripeAccount) {
      return NextResponse.json({ error: 'Negocio sem conta Stripe Connect' }, { status: 400 });
    }

    const isStudent = actor.userType === 'student';
    if (!isStudent) {
      const allowed = await canManageByStaff(actor.uid, businessId);
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (actor.studentBusinessId !== businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'create') {
      const { customerId, currency = 'brl' } = body;
      let amount = typeof body.amount === 'number' && body.amount > 0 ? body.amount : 0;

      if (!customerId) {
        return NextResponse.json({ error: 'customerId e obrigatorio' }, { status: 400 });
      }

      if (isStudent && actor.studentCustomerId !== customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const customerSnap = await db.collection('businesses').doc(businessId).collection('customers').doc(customerId).get();
      if (!customerSnap.exists) return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 });
      const customerData = customerSnap.data() as {
        email?: string;
        firstName?: string;
        lastName?: string;
        stripeCustomerId?: string;
        tuitionTypeId?: string;
      };
      if (!customerData.email) return NextResponse.json({ error: 'Aluno sem email para assinatura' }, { status: 400 });

      let tuitionTypeId = typeof body.tuitionTypeId === 'string' && body.tuitionTypeId ? body.tuitionTypeId : undefined;
      if (!tuitionTypeId && customerData.tuitionTypeId) {
        tuitionTypeId = customerData.tuitionTypeId;
      }
      let tuitionTypeName: string | undefined;
      let suggestedAmountCents = 0;
      if (tuitionTypeId) {
        const ttSnap = await db.collection('businesses').doc(businessId).collection('tuitionTypes').doc(tuitionTypeId).get();
        if (!ttSnap.exists) {
          return NextResponse.json({ error: 'Tipo de mensalidade nao encontrado' }, { status: 400 });
        }
        const tt = ttSnap.data() as { name?: string; suggestedAmountCents?: number };
        tuitionTypeName = String(tt.name || '').trim() || undefined;
        if (typeof tt.suggestedAmountCents === 'number' && tt.suggestedAmountCents > 0) {
          suggestedAmountCents = tt.suggestedAmountCents;
        }
      }

      if (amount <= 0) {
        amount = suggestedAmountCents;
      }
      if (amount <= 0) {
        return NextResponse.json(
          {
            error:
              'Valor da mensalidade nao definido. Informe o valor (R$) no tipo em Pagamentos > Tipos de mensalidade.',
            code: 'amount_required',
          },
          { status: 400 },
        );
      }

      const existingSnap = await db
        .collection('businesses')
        .doc(businessId)
        .collection('studentSubscriptions')
        .where('customerId', '==', customerId)
        .get();
      const blockingStatuses = new Set(['active', 'past_due', 'incomplete', 'pending_checkout']);
      for (const docSnap of existingSnap.docs) {
        const st = (docSnap.data() as { status?: string }).status;
        if (st && blockingStatuses.has(st)) {
          return NextResponse.json(
            {
              error: 'Este aluno ja possui mensalidade ativa ou aguardando pagamento.',
              code: 'subscription_exists',
              subscriptionId: docSnap.id,
            },
            { status: 409 },
          );
        }
      }

      const productDisplayName = tuitionTypeName ? `Mensalidade — ${tuitionTypeName}` : 'Mensalidade Escolar';

      let stripeCustomerId = customerData.stripeCustomerId;
      if (!stripeCustomerId) {
        const existing = await stripe.customers.list({ email: customerData.email, limit: 1 }, { stripeAccount });
        if (existing.data.length > 0) {
          stripeCustomerId = existing.data[0].id;
        } else {
          const created = await stripe.customers.create(
            {
              email: customerData.email,
              name: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
              metadata: { businessId, customerId },
            },
            { stripeAccount }
          );
          stripeCustomerId = created.id;
        }
        await customerSnap.ref.set({ stripeCustomerId, updatedAt: Timestamp.now() }, { merge: true });
      }

      const product = await stripe.products.create(
        {
          name: productDisplayName,
          metadata: {
            businessId,
            customerId,
            kind: 'student_tuition',
            ...(tuitionTypeId ? { tuitionTypeId } : {}),
            ...(tuitionTypeName ? { tuitionTypeName } : {}),
          },
        },
        { stripeAccount }
      );

      const price = await stripe.prices.create(
        {
          product: product.id,
          currency: currency.toLowerCase(),
          unit_amount: amount,
          recurring: { interval: 'month' },
        },
        { stripeAccount }
      );

      const subscription = await stripe.subscriptions.create(
        {
          customer: stripeCustomerId,
          items: [{ price: price.id }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          metadata: {
            businessId,
            customerId,
            subscriptionKind: 'student_tuition',
            ...(tuitionTypeId ? { tuitionTypeId } : {}),
            ...(tuitionTypeName ? { tuitionTypeName } : {}),
          },
          expand: ['latest_invoice.confirmation_secret', 'latest_invoice.payment_intent'],
        },
        { stripeAccount }
      );

      const clientSecret = await resolveSubscriptionInitialPaymentClientSecret(subscription, stripeAccount);
      if (!clientSecret) {
        try {
          await stripe.subscriptions.cancel(subscription.id, {}, { stripeAccount });
        } catch {
          /* ignore cleanup failure */
        }
        return NextResponse.json(
          { error: 'Nao foi possivel obter o client_secret do pagamento inicial. Tente novamente.' },
          { status: 502 }
        );
      }

      const status = subscription.status;
      const subRef = db.collection('businesses').doc(businessId).collection('studentSubscriptions').doc(subscription.id);

      await subRef.set({
        businessId,
        customerId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId,
        stripeProductId: product.id,
        stripePriceId: price.id,
        amount,
        currency: currency.toLowerCase(),
        interval: 'month',
        status,
        ...(tuitionTypeId ? { tuitionTypeId } : {}),
        ...(tuitionTypeName ? { tuitionTypeName } : {}),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        firestoreSubscriptionId: subscription.id,
        clientSecret,
        stripeConnectAccountId: stripeAccount,
      });
    }

    if (action === 'prepare_incomplete_payment') {
      if (!isStudent) {
        return NextResponse.json({ error: 'Apenas o aluno pode preparar o pagamento da mensalidade' }, { status: 403 });
      }

      const { subscriptionId } = body;
      if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId obrigatorio' }, { status: 400 });

      const subRef = db.collection('businesses').doc(businessId).collection('studentSubscriptions').doc(subscriptionId);
      const snap = await subRef.get();
      if (!snap.exists) return NextResponse.json({ error: 'Assinatura nao encontrada' }, { status: 404 });

      const data = snap.data() as { customerId?: string; stripeSubscriptionId?: string };
      if (isStudent && actor.studentCustomerId !== data.customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!data.stripeSubscriptionId) {
        return NextResponse.json({ error: 'Assinatura sem ID Stripe' }, { status: 400 });
      }

      const subscription = await stripe.subscriptions.retrieve(data.stripeSubscriptionId, {
        expand: ['latest_invoice.confirmation_secret', 'latest_invoice.payment_intent'],
      }, { stripeAccount });

      if (subscription.status !== 'incomplete') {
        return NextResponse.json(
          { error: 'Esta assinatura nao aguarda pagamento inicial', code: 'not_incomplete' },
          { status: 409 }
        );
      }

      const clientSecret = await resolveSubscriptionInitialPaymentClientSecret(subscription, stripeAccount);
      if (!clientSecret) {
        return NextResponse.json({ error: 'Pagamento inicial indisponivel para esta assinatura' }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        clientSecret,
        stripeConnectAccountId: stripeAccount,
        subscriptionId: data.stripeSubscriptionId,
      });
    }

    if (action === 'cancel') {
      const { subscriptionId } = body;
      if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId obrigatorio' }, { status: 400 });
      const subRef = db.collection('businesses').doc(businessId).collection('studentSubscriptions').doc(subscriptionId);
      const snap = await subRef.get();
      if (!snap.exists) return NextResponse.json({ error: 'Assinatura nao encontrada' }, { status: 404 });
      const data = snap.data() as { stripeSubscriptionId?: string };
      if (data.stripeSubscriptionId) {
        await stripe.subscriptions.update(
          data.stripeSubscriptionId,
          { cancel_at_period_end: true },
          { stripeAccount }
        );
      }
      await subRef.set({ cancelAtPeriodEnd: true, updatedAt: Timestamp.now() }, { merge: true });
      return NextResponse.json({ success: true });
    }

    if (action === 'sync_from_stripe') {
      if (!isStudent) {
        return NextResponse.json({ error: 'Apenas o aluno pode sincronizar o status' }, { status: 403 });
      }
      if (actor.studentBusinessId !== businessId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const customerId = actor.studentCustomerId;
      if (!customerId || typeof customerId !== 'string') {
        return NextResponse.json({ error: 'Conta sem vinculo de aluno' }, { status: 400 });
      }

      const col = db.collection('businesses').doc(businessId).collection('studentSubscriptions');
      const snap = await col.where('customerId', '==', customerId).get();
      const updated: string[] = [];

      for (const docSnap of snap.docs) {
        const d = docSnap.data() as { stripeSubscriptionId?: string };
        const stripeSubId =
          typeof d.stripeSubscriptionId === 'string' && d.stripeSubscriptionId.startsWith('sub_')
            ? d.stripeSubscriptionId
            : docSnap.id.startsWith('sub_')
              ? docSnap.id
              : null;
        if (!stripeSubId) continue;

        try {
          const sub = await stripe.subscriptions.retrieve(stripeSubId, {}, { stripeAccount });
          const ext = sub as Stripe.Subscription & { current_period_start?: number; current_period_end?: number };
          const periodPatch: Record<string, unknown> = {};
          if (typeof ext.current_period_start === 'number') {
            periodPatch.currentPeriodStart = Timestamp.fromMillis(ext.current_period_start * 1000);
          }
          if (typeof ext.current_period_end === 'number') {
            periodPatch.currentPeriodEnd = Timestamp.fromMillis(ext.current_period_end * 1000);
          }

          await docSnap.ref.set(
            {
              status: sub.status,
              cancelAtPeriodEnd: sub.cancel_at_period_end === true,
              ...periodPatch,
              updatedAt: Timestamp.now(),
            },
            { merge: true },
          );
          updated.push(stripeSubId);

          if (sub.status === 'active' || sub.status === 'trialing') {
            const li = sub.latest_invoice;
            const invId =
              typeof li === 'string' ? li : li && typeof li === 'object' && 'id' in li ? (li as Stripe.Invoice).id : null;
            if (invId) {
              try {
                const inv = await stripe.invoices.retrieve(invId, { expand: ['payment_intent'] }, { stripeAccount });
                if (inv.status === 'paid') {
                  await recordTuitionInvoicePaymentForConnect({
                    businessId,
                    invoice: inv,
                    stripeSubscriptionId: stripeSubId,
                    stripeAccount,
                  });
                }
              } catch (e) {
                console.warn('[students/subscriptions/manage] sync_from_stripe pagamento', invId, e);
              }
            }
          }
        } catch (e) {
          console.warn('[students/subscriptions/manage] sync_from_stripe falhou para', stripeSubId, e);
        }
      }

      return NextResponse.json({ success: true, updated });
    }

    if (action === 'portal') {
      const { subscriptionId } = body;
      if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId obrigatorio' }, { status: 400 });
      const subRef = db.collection('businesses').doc(businessId).collection('studentSubscriptions').doc(subscriptionId);
      const snap = await subRef.get();
      if (!snap.exists) return NextResponse.json({ error: 'Assinatura nao encontrada' }, { status: 404 });
      const data = snap.data() as { stripeCustomerId?: string; customerId?: string };
      if (isStudent && actor.studentCustomerId !== data.customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!data.stripeCustomerId) return NextResponse.json({ error: 'Assinatura sem cliente Stripe' }, { status: 400 });
      const session = await stripe.billingPortal.sessions.create(
        {
          customer: data.stripeCustomerId,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tenant/student/financeiro`,
        },
        { stripeAccount }
      );
      return NextResponse.json({ success: true, url: session.url });
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[students/subscriptions/manage] Error:', error);
    return NextResponse.json({ error: err?.message || 'Falha ao processar assinatura' }, { status: 500 });
  }
}

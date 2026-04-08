import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { stripe } from '@/lib/stripe/client';
import { Timestamp } from 'firebase-admin/firestore';

type Action = 'create' | 'cancel' | 'portal';

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
      const { customerId, amount = 0, currency = 'brl' } = body;
      if (!customerId || amount <= 0) {
        return NextResponse.json({ error: 'customerId e amount sao obrigatorios' }, { status: 400 });
      }

      const customerSnap = await db.collection('businesses').doc(businessId).collection('customers').doc(customerId).get();
      if (!customerSnap.exists) return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 });
      const customerData = customerSnap.data() as { email?: string; firstName?: string; lastName?: string; stripeCustomerId?: string };
      if (!customerData.email) return NextResponse.json({ error: 'Aluno sem email para assinatura' }, { status: 400 });

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

      const session = await stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          customer: stripeCustomerId,
          line_items: [
            {
              price_data: {
                currency,
                unit_amount: amount,
                recurring: { interval: 'month' },
                product_data: { name: 'Mensalidade' },
              },
              quantity: 1,
            },
          ],
          metadata: { businessId, customerId, subscriptionKind: 'student_tuition' },
          success_url: body.successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tenant/student/financeiro`,
          cancel_url: body.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tenant/student/financeiro`,
        },
        { stripeAccount }
      );

      const docRef = await db.collection('businesses').doc(businessId).collection('studentSubscriptions').add({
        businessId,
        customerId,
        stripeCustomerId,
        stripeCheckoutSessionId: session.id,
        amount,
        currency,
        interval: 'month',
        status: 'pending_checkout',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({ success: true, id: docRef.id, checkoutUrl: session.url });
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
  } catch (error: any) {
    console.error('[students/subscriptions/manage] Error:', error);
    return NextResponse.json({ error: error?.message || 'Falha ao processar assinatura' }, { status: 500 });
  }
}

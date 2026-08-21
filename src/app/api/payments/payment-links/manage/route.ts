import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { stripe } from '@/lib/stripe/client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      businessId?: string;
      linkId?: string;
      action?: 'cancel' | 'setCustomer';
      customerId?: string | null;
    };
    const { businessId, linkId, action, customerId } = body;

    if (!businessId || !linkId || !action) {
      return NextResponse.json({ error: 'Campos obrigatórios: businessId, linkId, action' }, { status: 400 });
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
      anyPermission: ['manageBookings'],
    });
    if (authError(authResult)) return authResult.error;

    const linkRef = db.collection('businesses').doc(businessId).collection('paymentLinks').doc(linkId);
    const snap = await linkRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }
    const businessData = authResult.business as { stripeConnectAccountId?: string };
    const stripeAccount = businessData?.stripeConnectAccountId;
    const data = snap.data() as { stripePaymentLinkId?: string; active?: boolean; linkKind?: string };

    if (action === 'cancel') {
      if (data.stripePaymentLinkId?.startsWith('pl_') && stripeAccount) {
        await stripe.paymentLinks.update(
          data.stripePaymentLinkId,
          { active: false },
          { stripeAccount }
        );
      }
      await linkRef.update({
        active: false,
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'setCustomer') {
      const clear = customerId === '' || customerId === null || customerId === undefined;
      if (!clear) {
        const custDoc = await db
          .collection('businesses')
          .doc(businessId)
          .collection('customers')
          .doc(customerId as string)
          .get();
        if (!custDoc.exists) {
          return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 });
        }
        await linkRef.update({
          linkedCustomerId: customerId as string,
          updatedAt: Timestamp.now(),
        });
      } else {
        await linkRef.update({
          linkedCustomerId: FieldValue.delete(),
          updatedAt: Timestamp.now(),
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('[payment-links/manage]', error);
    return NextResponse.json({ error: 'Falha ao processar' }, { status: 500 });
  }
}

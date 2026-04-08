import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { stripe } from '@/lib/stripe/client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

async function canManagePaymentLinks(uid: string, businessId: string): Promise<boolean> {
  const user = await auth.getUser(uid);
  const custom = user.customClaims as {
    businessRoles?: Record<string, string>;
    userType?: string;
    platformAdmin?: boolean;
  } | undefined;
  if (custom?.userType === 'platform_admin' && custom?.platformAdmin === true) return true;
  const role = custom?.businessRoles?.[businessId];
  if (role === 'owner' || role === 'manager') return true;
  const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').doc(uid).get();
  const perms = staffSnap.data()?.permissions as Record<string, boolean> | undefined;
  return Boolean(perms?.manageBookings);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

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

    const allowed = await canManagePaymentLinks(uid, businessId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const linkRef = db.collection('businesses').doc(businessId).collection('paymentLinks').doc(linkId);
    const snap = await linkRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }
    const businessSnap = await db.collection('businesses').doc(businessId).get();
    const businessData = businessSnap.data() as { stripeConnectAccountId?: string } | undefined;
    const stripeAccount = businessData?.stripeConnectAccountId;
    const data = snap.data() as { stripePaymentLinkId?: string; active?: boolean };

    if (action === 'cancel') {
      if (data.stripePaymentLinkId && stripeAccount) {
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

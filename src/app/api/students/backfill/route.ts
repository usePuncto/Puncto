import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    if (decoded.userType !== 'platform_admin' || decoded.platformAdmin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { businessId?: string };
    const businessId = body.businessId;
    if (!businessId) return NextResponse.json({ error: 'businessId obrigatorio' }, { status: 400 });

    const linksSnap = await db.collection('businesses').doc(businessId).collection('paymentLinks').get();
    let updated = 0;
    for (const linkDoc of linksSnap.docs) {
      const data = linkDoc.data() as { linkedCustomerId?: string; stripePaymentLinkId?: string };
      if (!data.linkedCustomerId || !data.stripePaymentLinkId) continue;
      const payments = await db
        .collection('businesses')
        .doc(businessId)
        .collection('payments')
        .where('stripePaymentLinkStripeId', '==', data.stripePaymentLinkId)
        .get();
      for (const p of payments.docs) {
        const pData = p.data() as { customerId?: string };
        if (!pData.customerId) {
          await p.ref.update({ customerId: data.linkedCustomerId, updatedAt: Timestamp.now() });
          updated += 1;
        }
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error('[students/backfill] Error:', error);
    return NextResponse.json({ error: error?.message || 'Falha no backfill' }, { status: 500 });
  }
}

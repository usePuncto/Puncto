import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Order, SplitPayment } from '@/types/restaurant';
import { stripe } from '@/lib/stripe/client';
import { createStripePaymentLinkWithBrlMethods } from '@/lib/stripe/paymentMethods';

// POST - Create split payments for an order
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json();
    const { businessId, splits } = body;

    if (!businessId || !splits || !Array.isArray(splits)) {
      return NextResponse.json(
        { error: 'businessId and splits array are required' },
        { status: 400 }
      );
    }

    const orderRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('orders')
      .doc(params.orderId);

    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data() as Order;

    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const stripeAccount = (businessDoc.data() as { stripeConnectAccountId?: string } | undefined)
      ?.stripeConnectAccountId;

    // Validate split amounts sum to order total
    const totalSplit = splits.reduce((sum: number, split: SplitPayment) => sum + split.amount, 0);
    if (totalSplit !== orderData.total) {
      return NextResponse.json(
        { error: 'Split amounts must sum to order total' },
        { status: 400 }
      );
    }

    // Create payment links for each split
    const paymentLinks = await Promise.all(
      splits.map(async (split: SplitPayment) => {
        const linkParams = {
          line_items: [
            {
              price_data: {
                currency: 'brl',
                product_data: {
                  name: `Pagamento Mesa ${orderData.tableNumber} - ${split.userId}`,
                },
                unit_amount: split.amount,
              },
              quantity: 1,
            },
          ],
          payment_method_options: {
            boleto: { expires_after_days: 3 },
          },
          metadata: {
            orderId: params.orderId,
            businessId,
            splitUserId: split.userId,
          },
        };
        const paymentLink = stripeAccount
          ? await createStripePaymentLinkWithBrlMethods(linkParams, stripeAccount)
          : await stripe.paymentLinks.create({
              ...linkParams,
              payment_method_types: ['card', 'pix', 'boleto'],
            });

        return {
          ...split,
          paymentId: paymentLink.id,
          paymentUrl: paymentLink.url,
        };
      })
    );

    // Update order with split payments
    await orderRef.update({
      splitPayments: paymentLinks,
      paymentMethod: 'split',
      updatedAt: new Date(),
    });

    return NextResponse.json({
      splits: paymentLinks,
    });
  } catch (error) {
    console.error('[orders split POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create split payments' },
      { status: 500 }
    );
  }
}

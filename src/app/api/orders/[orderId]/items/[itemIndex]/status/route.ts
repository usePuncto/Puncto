import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Order, OrderItemStatus } from '@/types/restaurant';
import { authError, requireBusinessAuth } from '@/lib/auth/requireBusinessAuth';
// Dynamic import to avoid issues in edge runtime

// PUT - Update item status
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string; itemIndex: string } }
) {
  try {
    const body = await request.json();
    const { businessId, status } = body;

    if (!businessId || !status) {
      return NextResponse.json(
        { error: 'businessId and status are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId);
    if (authError(authResult)) return authResult.error;


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
    const itemIndex = parseInt(params.itemIndex);

    if (itemIndex < 0 || itemIndex >= orderData.items.length) {
      return NextResponse.json(
        { error: 'Invalid item index' },
        { status: 400 }
      );
    }

    const updatedItems = [...orderData.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      status: status as OrderItemStatus,
    };

    // Update timestamps based on status
    const now = new Date();
    if (status === 'preparing' && !updatedItems[itemIndex].preparedAt) {
      updatedItems[itemIndex].preparedAt = now;
    } else if (status === 'ready' && !updatedItems[itemIndex].readyAt) {
      updatedItems[itemIndex].readyAt = now;
    } else if (status === 'delivered' && !updatedItems[itemIndex].deliveredAt) {
      updatedItems[itemIndex].deliveredAt = now;
    }

    await orderRef.update({
      items: updatedItems,
      updatedAt: now,
    });

    // Publish real-time update
    try {
      const { publishToCentrifugo } = await import('@/lib/centrifugo/publish');
      await publishToCentrifugo(`org:${businessId}:orders`, {
        type: 'order_updated',
        orderId: params.orderId,
        order: { items: updatedItems },
      });

      await publishToCentrifugo(`org:${businessId}:order:${params.orderId}`, {
        type: 'order_updated',
        orderId: params.orderId,
        order: { items: updatedItems },
      });

      // Publish to kitchen channel
      await publishToCentrifugo(`org:${businessId}:kitchen`, {
        type: 'item_status_updated',
        orderId: params.orderId,
        itemIndex,
        status,
      });
    } catch (error) {
      console.error('Failed to publish to Centrifugo:', error);
    }

    const updatedDoc = await orderRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[orders item status PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update item status' },
      { status: 500 }
    );
  }
}

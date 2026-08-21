import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Order } from '@/types/restaurant';
import { authError, requireBusinessAuth } from '@/lib/auth/requireBusinessAuth';
// Dynamic import to avoid issues in edge runtime

// PUT - Update order status
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
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

    const updates: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'paid') {
      updates.closedAt = new Date();
    }

    await orderRef.update(updates);

    // Publish real-time update
    try {
      const { publishToCentrifugo } = await import('@/lib/centrifugo/publish');
      await publishToCentrifugo(`org:${businessId}:orders`, {
        type: 'order_updated',
        orderId: params.orderId,
        order: { status, ...updates },
      });

      await publishToCentrifugo(`org:${businessId}:order:${params.orderId}`, {
        type: 'order_updated',
        orderId: params.orderId,
        order: { status, ...updates },
      });
    } catch (error) {
      console.error('Failed to publish to Centrifugo:', error);
      // Don't fail the request if Centrifugo fails
    }

    const updatedDoc = await orderRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[orders status PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}

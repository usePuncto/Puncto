import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Order } from '@/types/restaurant';
import { encodeEscPos } from '@/lib/printing/thermal';
import { authError, requireBusinessAuth } from '@/lib/auth/requireBusinessAuth';

// GET - Get print data for an order
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId);
    if (authError(authResult)) return authResult.error;


    const orderDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('orders')
      .doc(params.orderId)
      .get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = {
      id: orderDoc.id,
      ...orderDoc.data(),
    } as Order;

    // Generate ESC/POS commands
    const escPosData = encodeEscPos(order);

    return NextResponse.json({
      orderId: params.orderId,
      escPosData,
      format: 'escpos',
    });
  } catch (error) {
    console.error('[orders print GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate print data' },
      { status: 500 }
    );
  }
}

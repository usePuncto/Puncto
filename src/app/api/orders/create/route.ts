import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Order, OrderItem } from '@/types/restaurant';
import { verifyBusinessFeatureAccess } from '@/lib/api/featureValidation';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';

// POST - Create a new order
export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = await checkIpRateLimit(`orders-create:${ip}`, {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const { businessId, tableId, items, customerId } = body;

    if (!businessId || !tableId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'businessId, tableId, and items are required' },
        { status: 400 }
      );
    }

    // Verify business exists and has access to table ordering feature
    const featureCheck = await verifyBusinessFeatureAccess(businessId, 'tableOrdering');
    
    if (!featureCheck) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!featureCheck.hasAccess) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          message: `Table ordering feature is not available for your business type (${featureCheck.business.industry}) or subscription tier (${featureCheck.business.subscription.tier})`,
        },
        { status: 403 }
      );
    }

    // Verify table exists
    const tableDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('tables')
      .doc(tableId)
      .get();

    if (!tableDoc.exists) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    const tableData = tableDoc.data();
    const tableNumber = tableData?.number || tableId;

    // Resolve prices/names from catalog (do not trust client unitPrice)
    const pricedItems: OrderItem[] = [];
    for (const item of items as Array<{
      productId?: string;
      quantity?: number;
      notes?: string;
      name?: string;
      unitPrice?: number;
    }>) {
      if (!item?.productId || !item.quantity || item.quantity < 1 || item.quantity > 99) {
        return NextResponse.json({ error: 'Invalid order item' }, { status: 400 });
      }
      const productDoc = await db
        .collection('businesses')
        .doc(businessId)
        .collection('products')
        .doc(item.productId)
        .get();
      if (!productDoc.exists) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }
      const product = productDoc.data() as { name?: string; price?: number; available?: boolean };
      if (product.available === false) {
        return NextResponse.json(
          { error: `Product unavailable: ${product.name || item.productId}` },
          { status: 400 }
        );
      }
      const unitPrice =
        typeof product.price === 'number' ? product.price : Number(product.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: 'Invalid product price' }, { status: 400 });
      }
      pricedItems.push({
        productId: item.productId,
        name: product.name || item.name || 'Item',
        quantity: Math.floor(item.quantity),
        unitPrice,
        notes: typeof item.notes === 'string' ? item.notes.slice(0, 300) : undefined,
        status: 'pending',
      });
    }

    // Calculate totals
    const subtotal = pricedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const tax = Math.round(subtotal * 0.1); // 10% tax (configurable)
    const tip = 0;
    const total = subtotal + tax + tip;

    // Create order
    const ordersRef = db.collection('businesses').doc(businessId).collection('orders');
    const now = new Date();

    const orderData: Omit<Order, 'id'> = {
      businessId,
      tableId,
      tableNumber,
      status: 'open',
      items: pricedItems,
      subtotal,
      tax,
      tip,
      total,
      customerId,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await ordersRef.add(orderData);

    // Update table with current order
    await tableDoc.ref.update({
      currentOrderId: docRef.id,
      updatedAt: now,
    });

    // Publish real-time update
    try {
      const { publishToCentrifugo } = await import('@/lib/centrifugo/publish');
      await publishToCentrifugo(`org:${businessId}:orders`, {
        type: 'order_created',
        order: {
          id: docRef.id,
          ...orderData,
        },
      });

      await publishToCentrifugo(`org:${businessId}:kitchen`, {
        type: 'order_created',
        order: {
          id: docRef.id,
          ...orderData,
        },
      });
    } catch (error) {
      console.error('Failed to publish to Centrifugo:', error);
      // Don't fail the request if Centrifugo fails
    }

    return NextResponse.json({
      id: docRef.id,
      ...orderData,
    });
  } catch (error) {
    console.error('[orders create POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

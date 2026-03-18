import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { PurchaseOrder } from '@/types/purchases';

// GET - List all purchase orders
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const purchasesRef = db.collection('businesses').doc(businessId).collection('purchaseOrders');
    let query: FirebaseFirestore.Query = purchasesRef.orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const purchaseOrders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ purchaseOrders });
  } catch (error) {
    console.error('[purchases GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

// POST - Create a new purchase order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, purchaseOrder } = body;

    if (!businessId || !purchaseOrder) {
      return NextResponse.json(
        { error: 'businessId and purchaseOrder are required' },
        { status: 400 }
      );
    }

    if (!purchaseOrder.supplierId || !purchaseOrder.items || purchaseOrder.items.length === 0) {
      return NextResponse.json(
        { error: 'supplierId and items are required' },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = purchaseOrder.items.reduce(
      (sum: number, item: any) => sum + item.total,
      0
    );
    const tax = Math.round(subtotal * 0.1); // 10% tax (configurable)
    const total = subtotal + tax;

    const purchasesRef = db.collection('businesses').doc(businessId).collection('purchaseOrders');
    const now = new Date();

    const poData: Record<string, unknown> = {
      businessId,
      supplierId: purchaseOrder.supplierId,
      status: purchaseOrder.status || 'draft',
      items: purchaseOrder.items.map((item: any) => ({
        ...item,
        unitCost: Math.round(item.unitCost * 100), // Convert to cents
        total: Math.round(item.total * 100),
      })),
      subtotal: Math.round(subtotal * 100),
      tax: Math.round(tax * 100),
      total: Math.round(total * 100),
      createdAt: now,
      createdBy: purchaseOrder.createdBy || 'system',
      updatedAt: now,
    };
    if (purchaseOrder.expectedDeliveryDate) {
      poData.expectedDeliveryDate = new Date(purchaseOrder.expectedDeliveryDate);
    }

    const docRef = await purchasesRef.add(poData);

    return NextResponse.json({
      id: docRef.id,
      ...poData,
    });
  } catch (error) {
    console.error('[purchases POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}

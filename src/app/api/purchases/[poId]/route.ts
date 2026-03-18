import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { PurchaseOrder } from '@/types/purchases';

// PUT - Update a purchase order (draft only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { poId: string } }
) {
  try {
    const body = await request.json();
    const { businessId, updates } = body;

    if (!businessId || !updates) {
      return NextResponse.json(
        { error: 'businessId and updates are required' },
        { status: 400 }
      );
    }

    const poRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('purchaseOrders')
      .doc(params.poId);

    const poDoc = await poRef.get();
    if (!poDoc.exists) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    const po = poDoc.data() as PurchaseOrder;
    if (po.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft purchase orders can be edited' },
        { status: 400 }
      );
    }

    const now = new Date();
    const poData: Record<string, unknown> = {
      ...updates,
      updatedAt: now,
    };

    // Recalculate totals if items provided
    if (updates.items && Array.isArray(updates.items) && updates.items.length > 0) {
      const items = updates.items.map((item: any) => ({
        ...item,
        unitCost: Math.round((item.unitCost ?? 0) * 100),
        total: Math.round((item.total ?? 0) * 100),
      }));
      const subtotal = items.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
      const tax = Math.round(subtotal * 0.1);
      poData.items = items;
      poData.subtotal = subtotal;
      poData.tax = tax;
      poData.total = subtotal + tax;
    }

    // Remove undefined
    const clean = Object.fromEntries(
      Object.entries(poData).filter(([, v]) => v != null)
    );

    await poRef.update(clean);

    const updatedDoc = await poRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[purchases PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 }
    );
  }
}

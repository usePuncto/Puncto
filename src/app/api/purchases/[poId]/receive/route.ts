import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { PurchaseOrder } from '@/types/purchases';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// POST - Mark purchase order as received and update inventory
export async function POST(
  request: NextRequest,
  { params }: { params: { poId: string } }
) {
  try {
    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


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

    if (po.status === 'received') {
      return NextResponse.json(
        { error: 'Purchase order already received' },
        { status: 400 }
      );
    }

    // Update inventory for each item
    const inventoryUpdates = po.items.map(async (item) => {
      if (!item.inventoryItemId) return;

      const itemRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('inventory')
        .doc(item.inventoryItemId);

      const itemDoc = await itemRef.get();
      if (!itemDoc.exists) return;

      const currentStock = itemDoc.data()?.currentStock || 0;
      const currentCost = itemDoc.data()?.cost || 0;

      // Calculate new average cost
      const totalValue = currentStock * currentCost + item.total;
      const newCost = Math.round(totalValue / (currentStock + item.quantity));

      // Create inventory movement
      const movementsRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('inventoryMovements');

      await movementsRef.add({
        businessId,
        itemId: item.inventoryItemId,
        type: 'in',
        quantity: item.quantity,
        unitCost: item.unitCost,
        reason: `Recebimento PO #${params.poId}`,
        purchaseOrderId: params.poId,
        createdBy: 'system',
        createdAt: new Date(),
      });

      // Update inventory item
      await itemRef.update({
        currentStock: currentStock + item.quantity,
        cost: newCost,
        updatedAt: new Date(),
      });
    });

    await Promise.all(inventoryUpdates);

    // Update purchase order status
    await poRef.update({
      status: 'received',
      receivedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[purchases receive POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to receive purchase order' },
      { status: 500 }
    );
  }
}

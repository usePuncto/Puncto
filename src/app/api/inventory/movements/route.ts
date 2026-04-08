import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { InventoryMovement, InventoryItem } from '@/types/inventory';

// GET - List inventory movements
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const itemId = searchParams.get('itemId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const movementsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('inventoryMovements');
    
    let query: FirebaseFirestore.Query = movementsRef.orderBy('createdAt', 'desc');

    if (itemId) {
      query = query.where('itemId', '==', itemId);
    }

    const snapshot = await query.limit(100).get();
    const movements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ movements });
  } catch (error) {
    console.error('[inventory movements GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}

// POST - Create inventory movement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, movement } = body;

    if (!businessId || !movement) {
      return NextResponse.json(
        { error: 'businessId and movement are required' },
        { status: 400 }
      );
    }

    if (!movement.itemId || !movement.type || !movement.quantity) {
      return NextResponse.json(
        { error: 'itemId, type, and quantity are required' },
        { status: 400 }
      );
    }

    // Get inventory item
    const itemRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('inventory')
      .doc(movement.itemId);

    const itemDoc = await itemRef.get();
    if (!itemDoc.exists) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    const item = itemDoc.data() as InventoryItem;

    // Calculate new stock
    let newStock = item.currentStock;
    if (movement.type === 'in' || movement.type === 'adjustment') {
      newStock += movement.quantity;
    } else if (movement.type === 'out' || movement.type === 'waste' || movement.type === 'transfer') {
      newStock -= movement.quantity;
      if (newStock < 0) {
        return NextResponse.json(
          { error: 'Insufficient stock' },
          { status: 400 }
        );
      }
    }

    // Update average cost if it's an "in" movement with unit cost
    let newCost = item.cost;
    if (movement.type === 'in' && movement.unitCost) {
      const totalValue = item.currentStock * item.cost + movement.quantity * movement.unitCost;
      newCost = Math.round(totalValue / (item.currentStock + movement.quantity));
    }

    // Create movement
    const movementsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('inventoryMovements');

    const movementData: Omit<InventoryMovement, 'id'> = {
      businessId,
      itemId: movement.itemId,
      type: movement.type,
      quantity: movement.quantity,
      createdBy: movement.createdBy || 'system',
      createdAt: new Date(),
    };

    // Firestore does not accept undefined values in document fields.
    if (typeof movement.unitCost === 'number') {
      movementData.unitCost = Math.round(movement.unitCost * 100);
    }
    if (movement.reason) movementData.reason = movement.reason;
    if (movement.purchaseOrderId) movementData.purchaseOrderId = movement.purchaseOrderId;
    if (movement.orderId) movementData.orderId = movement.orderId;

    const movementRef = await movementsRef.add(movementData);

    // Update inventory item
    await itemRef.update({
      currentStock: newStock,
      cost: newCost,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      id: movementRef.id,
      ...movementData,
      newStock,
    });
  } catch (error) {
    console.error('[inventory movements POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create movement' },
      { status: 500 }
    );
  }
}

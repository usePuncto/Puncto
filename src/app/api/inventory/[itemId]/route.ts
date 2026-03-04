import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { InventoryItem } from '@/types/inventory';

// GET - Get a single inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
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

    const itemDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('inventory')
      .doc(params.itemId)
      .get();

    if (!itemDoc.exists) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: itemDoc.id,
      ...itemDoc.data(),
    });
  } catch (error) {
    console.error('[inventory itemId GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

// PUT - Update an inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
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

    const itemRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('inventory')
      .doc(params.itemId);

    const itemDoc = await itemRef.get();
    if (!itemDoc.exists) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Convert cost to cents if provided
    if (updates.cost !== undefined) {
      updates.cost = Math.round(updates.cost * 100);
    }
    // Remove null/undefined values (Firestore rejects them)
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v != null)
    );

    await itemRef.update({
      ...cleanUpdates,
      updatedAt: new Date(),
    });

    const updatedDoc = await itemRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[inventory itemId PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
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

    const itemRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('inventory')
      .doc(params.itemId);

    const itemDoc = await itemRef.get();
    if (!itemDoc.exists) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    await itemRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[inventory itemId DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}

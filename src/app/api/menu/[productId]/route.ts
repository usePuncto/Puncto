import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Product } from '@/types/restaurant';

// GET - Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
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

    const productDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .doc(params.productId)
      .get();

    if (!productDoc.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: productDoc.id,
      ...productDoc.data(),
    });
  } catch (error) {
    console.error('[menu productId GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
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

    const productRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .doc(params.productId);

    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Firestore rejects undefined - strip undefined values
    const cleanUpdates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) cleanUpdates[k] = v;
    }

    await productRef.update(cleanUpdates);

    const updatedDoc = await productRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[menu productId PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
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

    const productRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .doc(params.productId);

    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    await productRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[menu productId DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

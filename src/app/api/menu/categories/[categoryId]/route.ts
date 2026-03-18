import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

// DELETE - Soft-delete a category (set active: false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
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

    const categoryRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('menuCategories')
      .doc(params.categoryId);

    const doc = await categoryRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    await categoryRef.update({
      active: false,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[menu categories DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

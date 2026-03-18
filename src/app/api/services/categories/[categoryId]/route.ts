import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

// DELETE - Remove a service category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const categoryRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('serviceCategories')
      .doc(params.categoryId);

    const doc = await categoryRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await categoryRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[service categories DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

// GET - List service categories
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }
    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('serviceCategories')
      .orderBy('name', 'asc')
      .get();
    const categories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[service categories GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST - Create service category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name } = body;
    if (!businessId || !name?.trim()) {
      return NextResponse.json({ error: 'businessId and name are required' }, { status: 400 });
    }
    const docRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('serviceCategories')
      .add({
        businessId,
        name: name.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    return NextResponse.json({ id: docRef.id, name: name.trim() });
  } catch (error) {
    console.error('[service categories POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

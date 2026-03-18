import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { MenuCategory } from '@/types/restaurant';

// GET - List all categories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const categoriesRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('menuCategories');

    // Fetch all categories, filter and sort in memory to avoid composite index requirement
    const snapshot = await categoriesRef.get();
    const categories = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((c) => (c as { active?: boolean }).active !== false)
      .sort((a, b) => ((a as { displayOrder?: number }).displayOrder ?? 0) - ((b as { displayOrder?: number }).displayOrder ?? 0));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[menu categories GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, category } = body;

    if (!businessId || !category) {
      return NextResponse.json(
        { error: 'businessId and category are required' },
        { status: 400 }
      );
    }

    if (!category.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const categoriesRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('menuCategories');

    const now = new Date();
    const categoryData: Omit<MenuCategory, 'id'> = {
      businessId,
      name: category.name,
      displayOrder: category.displayOrder || 0,
      active: category.active !== undefined ? category.active : true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await categoriesRef.add(categoryData);

    return NextResponse.json({
      id: docRef.id,
      ...categoryData,
    });
  } catch (error) {
    console.error('[menu categories POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

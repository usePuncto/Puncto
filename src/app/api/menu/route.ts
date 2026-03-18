import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { auth } from '@/lib/firebaseAdmin';
import { Product, MenuCategory } from '@/types/restaurant';
import { verifyBusinessFeatureAccess, extractBusinessIdFromQuery } from '@/lib/api/featureValidation';

// GET - List all products for a business
export async function GET(request: NextRequest) {
  try {
    const businessId = extractBusinessIdFromQuery(request);

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    // Verify business exists and has access to restaurant menu feature
    const featureCheck = await verifyBusinessFeatureAccess(businessId, 'restaurantMenu');
    
    if (!featureCheck) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!featureCheck.hasAccess) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          message: `Restaurant menu feature is not available for your business type (${featureCheck.business.industry}) or subscription tier (${featureCheck.business.subscription.tier})`,
        },
        { status: 403 }
      );
    }

    const category = request.nextUrl.searchParams.get('category');

    const productsRef = db.collection('businesses').doc(businessId).collection('products');
    // Single orderBy avoids composite index; secondary sort by name done in memory
    const snapshot = await productsRef.orderBy('displayOrder', 'asc').get();
    let products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (category) {
      products = products.filter((p) => (p as { category?: string }).category === category);
    }
    products.sort((a, b) => {
      const da = a as { displayOrder?: number; name?: string };
      const db = b as { displayOrder?: number; name?: string };
      if ((da.displayOrder ?? 0) !== (db.displayOrder ?? 0)) {
        return (da.displayOrder ?? 0) - (db.displayOrder ?? 0);
      }
      return (da.name ?? '').localeCompare(db.name ?? '');
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('[menu GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, product } = body;

    if (!businessId || !product) {
      return NextResponse.json(
        { error: 'businessId and product are required' },
        { status: 400 }
      );
    }

    // Verify business exists and has access to restaurant menu feature
    const featureCheck = await verifyBusinessFeatureAccess(businessId, 'restaurantMenu');
    
    if (!featureCheck) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!featureCheck.hasAccess) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          message: `Restaurant menu feature is not available for your business type (${featureCheck.business.industry}) or subscription tier (${featureCheck.business.subscription.tier})`,
        },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!product.name || !product.category || product.price === undefined) {
      return NextResponse.json(
        { error: 'Product name, category, and price are required' },
        { status: 400 }
      );
    }

    const productsRef = db.collection('businesses').doc(businessId).collection('products');
    const now = new Date();

    // Firestore rejects undefined - only include defined values
    const productData: Record<string, unknown> = {
      businessId,
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      allergens: product.allergens || [],
      available: product.available !== undefined ? product.available : true,
      variations: product.variations || [],
      ingredients: (product.ingredients || []).map((ing: { inventoryItemId: string; inventoryItemName?: string; quantity: number; unit?: string }) => ({
        inventoryItemId: ing.inventoryItemId,
        ...(ing.inventoryItemName != null && { inventoryItemName: ing.inventoryItemName }),
        quantity: ing.quantity,
        ...(ing.unit != null && { unit: ing.unit }),
      })),
      displayOrder: product.displayOrder || 0,
      createdAt: now,
      updatedAt: now,
    };
    if (product.imageUrl) productData.imageUrl = product.imageUrl;
    if (product.cost != null) productData.cost = product.cost;
    if (product.preparationTime != null) productData.preparationTime = product.preparationTime;

    const docRef = await productsRef.add(productData);

    return NextResponse.json({
      id: docRef.id,
      ...productData,
    });
  } catch (error) {
    console.error('[menu POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

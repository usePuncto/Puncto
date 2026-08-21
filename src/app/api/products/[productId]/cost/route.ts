import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Product } from '@/types/restaurant';
import { InventoryItem } from '@/types/inventory';
import { Recipe } from '@/lib/erp/costCalculation';
import { calculateCostBreakdown } from '@/lib/erp/costCalculation';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - Get cost breakdown for a product
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

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    // Get product
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

    const product = {
      id: productDoc.id,
      ...productDoc.data(),
    } as Product;

    // Get recipe
    const recipesSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('recipes')
      .where('productId', '==', params.productId)
      .limit(1)
      .get();

    const recipe = recipesSnapshot.empty
      ? null
      : ({
          id: recipesSnapshot.docs[0].id,
          ...recipesSnapshot.docs[0].data(),
        } as Recipe);

    // Get all inventory items
    const inventorySnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('inventory')
      .get();

    const ingredients = new Map<string, InventoryItem>();
    inventorySnapshot.docs.forEach((doc) => {
      ingredients.set(doc.id, {
        id: doc.id,
        ...doc.data(),
      } as InventoryItem);
    });

    // Calculate cost breakdown
    const breakdown = calculateCostBreakdown(product, recipe, ingredients);

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        currentPrice: product.price,
      },
      recipe: recipe
        ? {
            id: recipe.id,
            name: recipe.name,
            servings: recipe.servings,
            ingredients: recipe.ingredients,
          }
        : null,
      breakdown,
    });
  } catch (error) {
    console.error('[products cost GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cost breakdown' },
      { status: 500 }
    );
  }
}

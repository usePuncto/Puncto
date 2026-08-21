import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Recipe } from '@/lib/erp/costCalculation';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - List all recipes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const productId = searchParams.get('productId');

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

    const recipesRef = db.collection('businesses').doc(businessId).collection('recipes');
    let query: FirebaseFirestore.Query = recipesRef.orderBy('name', 'asc');

    if (productId) {
      query = query.where('productId', '==', productId);
    }

    const snapshot = await query.get();
    const recipes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error('[recipes GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

// POST - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, recipe } = body;

    if (!businessId || !recipe) {
      return NextResponse.json(
        { error: 'businessId and recipe are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    if (!recipe.productId || !recipe.name || !recipe.ingredients) {
      return NextResponse.json(
        { error: 'productId, name, and ingredients are required' },
        { status: 400 }
      );
    }

    // Calculate total cost (will be updated when inventory costs are known)
    const totalCost = recipe.laborCost || 0;

    const recipesRef = db.collection('businesses').doc(businessId).collection('recipes');

    const recipeData: Omit<Recipe, 'id'> = {
      productId: recipe.productId,
      name: recipe.name,
      servings: recipe.servings || 1,
      ingredients: recipe.ingredients,
      laborCost: recipe.laborCost ? Math.round(recipe.laborCost * 100) : undefined,
      totalCost: Math.round(totalCost * 100),
    };

    const docRef = await recipesRef.add(recipeData);

    return NextResponse.json({
      id: docRef.id,
      ...recipeData,
    });
  } catch (error) {
    console.error('[recipes POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}

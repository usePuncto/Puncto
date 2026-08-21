import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

export interface CostCenter {
  id: string;
  businessId: string;
  name: string;
  budget: number; // Monthly budget in cents
  currentSpend: number; // Calculated in cents
  period: string; // "2024-01"
  createdAt: Date;
}

// GET - List all cost centers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const period = searchParams.get('period');

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

    const budgetsRef = db.collection('businesses').doc(businessId).collection('costCenters');
    let query: FirebaseFirestore.Query = budgetsRef.orderBy('name', 'asc');

    if (period) {
      query = query.where('period', '==', period);
    }

    const snapshot = await query.get();
    const costCenters = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ costCenters });
  } catch (error) {
    console.error('[budgets GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost centers' },
      { status: 500 }
    );
  }
}

// POST - Create a new cost center
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, costCenter } = body;

    if (!businessId || !costCenter) {
      return NextResponse.json(
        { error: 'businessId and costCenter are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    if (!costCenter.name || !costCenter.budget || !costCenter.period) {
      return NextResponse.json(
        { error: 'name, budget, and period are required' },
        { status: 400 }
      );
    }

    const budgetsRef = db.collection('businesses').doc(businessId).collection('costCenters');
    const now = new Date();

    const costCenterData: Omit<CostCenter, 'id'> = {
      businessId,
      name: costCenter.name,
      budget: Math.round(costCenter.budget * 100), // Convert to cents
      currentSpend: 0,
      period: costCenter.period,
      createdAt: now,
    };

    const docRef = await budgetsRef.add(costCenterData);

    return NextResponse.json({
      id: docRef.id,
      ...costCenterData,
    });
  } catch (error) {
    console.error('[budgets POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create cost center' },
      { status: 500 }
    );
  }
}

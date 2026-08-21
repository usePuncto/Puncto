import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Dashboard } from '@/types/dashboard';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - List dashboards for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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

    const dashboardsSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('dashboards')
      .orderBy('createdAt', 'desc')
      .get();

    const dashboards = dashboardsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    }));

    return NextResponse.json({ data: dashboards });
  } catch (error) {
    console.error('[dashboards GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list dashboards' },
      { status: 500 }
    );
  }
}

// POST - Create dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, widgets } = body;

    if (!businessId || !name) {
      return NextResponse.json(
        { error: 'businessId and name are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const dashboardRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('dashboards')
      .doc();

    const dashboard: Omit<Dashboard, 'id'> = {
      businessId,
      name,
      widgets: widgets || [],
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await dashboardRef.set(dashboard);

    const createdDoc = await dashboardRef.get();
    return NextResponse.json(
      {
        id: createdDoc.id,
        ...createdDoc.data(),
        createdAt: createdDoc.data()?.createdAt?.toDate?.()?.toISOString() || createdDoc.data()?.createdAt,
        updatedAt: createdDoc.data()?.updatedAt?.toDate?.()?.toISOString() || createdDoc.data()?.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[dashboards POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}

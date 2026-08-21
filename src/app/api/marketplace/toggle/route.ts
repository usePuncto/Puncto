import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// POST - Enable/disable marketplace for a business
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, enabled, marketplaceProfile } = body;

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


    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const updateData: any = {
      marketplaceEnabled: enabled !== undefined ? enabled : true,
      updatedAt: new Date(),
    };

    if (marketplaceProfile) {
      updateData.marketplaceProfile = {
        ...businessDoc.data()?.marketplaceProfile,
        ...marketplaceProfile,
      };
    }

    await businessRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: `Marketplace ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    console.error('[marketplace toggle POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update marketplace status' },
      { status: 500 }
    );
  }
}

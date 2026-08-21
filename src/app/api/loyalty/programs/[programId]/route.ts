import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// PUT - Update a loyalty program
export async function PUT(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const body = await request.json();
    const { businessId, updates } = body;

    if (!businessId || !updates) {
      return NextResponse.json(
        { error: 'businessId and updates are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    const programRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('loyaltyPrograms')
      .doc(params.programId);

    const programDoc = await programRef.get();
    if (!programDoc.exists) {
      return NextResponse.json(
        { error: 'Loyalty program not found' },
        { status: 404 }
      );
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v != null)
    );

    await programRef.update({
      ...cleanUpdates,
      updatedAt: new Date(),
    });

    const updatedDoc = await programRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[loyalty program PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update loyalty program' },
      { status: 500 }
    );
  }
}

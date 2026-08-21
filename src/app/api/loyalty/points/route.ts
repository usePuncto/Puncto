import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { LoyaltyProgram } from '@/types/crm';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// POST - Award loyalty points
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, customerId, amount, orderId } = body;

    if (!businessId || !customerId || !amount) {
      return NextResponse.json(
        { error: 'businessId, customerId, and amount are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    // Get active loyalty program
    const programsRef = db.collection('businesses').doc(businessId).collection('loyaltyPrograms');
    const programsSnapshot = await programsRef.where('active', '==', true).limit(1).get();

    if (programsSnapshot.empty) {
      return NextResponse.json(
        { error: 'No active loyalty program found' },
        { status: 404 }
      );
    }

    const program = programsSnapshot.docs[0].data() as LoyaltyProgram;

    // Calculate points based on program rules
    let pointsToAward = 0;
    if (program.type === 'points') {
      if (program.rules.pointsPerReal) {
        pointsToAward = Math.round(amount * program.rules.pointsPerReal);
      }
      if (program.rules.pointsPerVisit) {
        pointsToAward += program.rules.pointsPerVisit;
      }
    }

    // Update customer loyalty points
    const customerRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('customers')
      .doc(customerId);

    const customerDoc = await customerRef.get();
    if (!customerDoc.exists) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const currentPoints = customerDoc.data()?.loyaltyPoints || 0;
    const newPoints = currentPoints + pointsToAward;

    await customerRef.update({
      loyaltyPoints: newPoints,
      totalPointsEarned: (customerDoc.data()?.totalPointsEarned || 0) + pointsToAward,
      updatedAt: new Date(),
    });

    // Record points transaction
    const transactionsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('loyaltyTransactions');

    await transactionsRef.add({
      customerId,
      orderId,
      type: 'earned',
      points: pointsToAward,
      reason: `Purchase: R$ ${(amount / 100).toFixed(2)}`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      pointsAwarded: pointsToAward,
      totalPoints: newPoints,
    });
  } catch (error) {
    console.error('[loyalty points POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to award points' },
      { status: 500 }
    );
  }
}

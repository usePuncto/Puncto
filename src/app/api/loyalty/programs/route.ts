import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { LoyaltyProgram } from '@/types/crm';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - List all loyalty programs
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

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    const programsRef = db.collection('businesses').doc(businessId).collection('loyaltyPrograms');
    const snapshot = await programsRef.orderBy('name', 'asc').get();
    
    const programs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ programs });
  } catch (error) {
    console.error('[loyalty programs GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty programs' },
      { status: 500 }
    );
  }
}

// POST - Create a new loyalty program
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, program } = body;

    if (!businessId || !program) {
      return NextResponse.json(
        { error: 'businessId and program are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    if (!program.name || !program.type) {
      return NextResponse.json(
        { error: 'name and type are required' },
        { status: 400 }
      );
    }

    const programsRef = db.collection('businesses').doc(businessId).collection('loyaltyPrograms');
    const now = new Date();

    const programData: Omit<LoyaltyProgram, 'id'> = {
      businessId,
      name: program.name,
      type: program.type,
      rules: program.rules || {},
      active: program.active !== undefined ? program.active : true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await programsRef.add(programData);

    return NextResponse.json({
      id: docRef.id,
      ...programData,
    });
  } catch (error) {
    console.error('[loyalty programs POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create loyalty program' },
      { status: 500 }
    );
  }
}

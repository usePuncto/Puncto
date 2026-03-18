import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

/**
 * DELETE - Remove professional (owners cannot be deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const role = (decodedToken as { businessRoles?: Record<string, string> }).businessRoles?.[businessId];
    if (role !== 'owner' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const professionalRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('professionals')
      .doc(params.id);

    const snap = await professionalRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
    }

    const data = snap.data();
    if (data?.isOwner === true) {
      return NextResponse.json({ error: 'O proprietário não pode ser excluído' }, { status: 403 });
    }

    await professionalRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[professionals DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/**
 * PATCH - Update professional (e.g. working hours)
 * Professionals can only update their own record; owners/managers can update any
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const body = await request.json();
    const { workingHours } = body;

    const professionalRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('professionals')
      .doc(params.id);

    const professionalSnap = await professionalRef.get();
    if (!professionalSnap.exists) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (workingHours && typeof workingHours === 'object') {
      updates.workingHours = workingHours;
    }

    await professionalRef.update(updates);
    const updated = await professionalRef.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('[professionals PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update professional' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

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

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

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

    // Remove private contact docs if present
    const privateSnap = await professionalRef.collection('private').get();
    await Promise.all(privateSnap.docs.map((d) => d.ref.delete()));
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

    const authResult = await requireBusinessAuth(request, businessId);
    if (authError(authResult)) return authResult.error;

    const { actor } = authResult;
    const isManager =
      actor.isPlatformAdmin ||
      actor.role === 'owner' ||
      actor.role === 'manager';
    const isSelf =
      actor.professionalId != null && actor.professionalId === params.id;
    if (!isManager && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      const businessData = businessDoc.data();
      const businessWh = businessData?.settings?.workingHours || {};
      const sanitized: Record<string, { open: string; close: string; closed: boolean }> = { ...workingHours };
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of days) {
        const b = businessWh[day];
        if (b && typeof b === 'object' && (b as { closed?: boolean }).closed === true) {
          sanitized[day] = { open: (b as any).open ?? '09:00', close: (b as any).close ?? '18:00', closed: true };
        }
      }
      updates.workingHours = sanitized;
    }

    await professionalRef.update(updates);
    const updated = await professionalRef.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('[professionals PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update professional' }, { status: 500 });
  }
}

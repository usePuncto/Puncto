import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// PATCH - Update business (displayName, phone, address, settings.workingHours)
export async function PATCH(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const body = await request.json();
    const { displayName, phone, address, workingHours, cancellationPolicy } = body;

    const businessRef = db.collection('businesses').doc(businessId);
    const businessDocData = authResult.business as unknown as Record<string, unknown>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (displayName !== undefined) {
      if (!displayName?.trim()) {
        return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
      }
      updates.displayName = displayName.trim();
    }

    if (phone !== undefined) updates.phone = phone?.trim() || '';

    if (address !== undefined) {
      const a = address as Record<string, string>;
      updates.address = {
        street: a.street?.trim() || '',
        number: a.number?.trim() || '',
        complement: a.complement?.trim() || '',
        neighborhood: a.neighborhood?.trim() || '',
        city: a.city?.trim() || '',
        state: a.state?.trim() || '',
        zipCode: a.zipCode?.trim() || '',
        country: a.country?.trim() || 'BR',
      };
    }

    if (workingHours !== undefined && typeof workingHours === 'object') {
      const current = (businessDocData.settings as Record<string, unknown>) || {};
      updates.settings = {
        ...current,
        workingHours,
      };
    }

    if (cancellationPolicy !== undefined && typeof cancellationPolicy === 'object') {
      const current = (businessDocData.settings as Record<string, unknown>) || {};
      const currentPolicy = (current.cancellationPolicy as Record<string, unknown>) || {};
      updates.settings = {
        ...(updates.settings as Record<string, unknown> || current),
        cancellationPolicy: { ...currentPolicy, ...cancellationPolicy },
      };
    }

    await businessRef.update(updates);

    const updatedDoc = await businessRef.get();
    return NextResponse.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('[business PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
}

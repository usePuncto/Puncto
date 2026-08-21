import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// PATCH - Update business settings
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: 'settings are required' },
        { status: 400 }
      );
    }

    const businessRef = db.collection('businesses').doc(businessId);
    const currentSettings =
      ((authResult.business.settings as unknown) as Record<string, unknown>) || {};
    const incomingSettings = settings as Record<string, unknown>;

    // Deep merge for nested objects (e.g. whatsapp with messageTemplates)
    const mergedSettings: Record<string, unknown> = {
      ...currentSettings,
      ...incomingSettings,
    };

    if (incomingSettings.whatsapp && typeof incomingSettings.whatsapp === 'object') {
      mergedSettings.whatsapp = {
        ...(typeof currentSettings.whatsapp === 'object' && currentSettings.whatsapp
          ? (currentSettings.whatsapp as Record<string, unknown>)
          : {}),
        ...(incomingSettings.whatsapp as Record<string, unknown>),
      };
    }

    // Update settings
    await businessRef.update({
      settings: mergedSettings,
      updatedAt: new Date(),
    });

    const updatedDoc = await businessRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[settings PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

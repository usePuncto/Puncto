/**
 * Check if a business has WhatsApp connected (Embedded Signup).
 * Returns only connected status - never credentials.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppCredentials } from '@/lib/whatsapp/credentials';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const creds = await getWhatsAppCredentials(businessId);
    return NextResponse.json({
      connected: !!creds,
      phoneNumber: creds?.phoneNumber || null,
    });
  } catch (error) {
    console.error('[whatsapp/status] Error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

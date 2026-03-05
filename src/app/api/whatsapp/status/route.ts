/**
 * Check if a business has WhatsApp connected (Embedded Signup).
 * Returns only connected status - never credentials.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppCredentials } from '@/lib/whatsapp/credentials';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

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

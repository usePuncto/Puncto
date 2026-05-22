/**
 * Disconnect Evolution WhatsApp instance for a business.
 */
import { NextRequest, NextResponse } from 'next/server';
import { deleteWhatsAppCredentials } from '@/lib/whatsapp/credentials';
import { logoutInstance } from '@/lib/whatsapp/evolution';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    await logoutInstance(businessId);
    await deleteWhatsAppCredentials(businessId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[whatsapp/evolution/disconnect] Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}

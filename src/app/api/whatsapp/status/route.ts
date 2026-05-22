/**
 * WhatsApp connection status (Evolution API or legacy Meta credentials).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppCredentials, saveEvolutionCredentials } from '@/lib/whatsapp/credentials';
import {
  ensureInstanceAndGetQr,
  getConnectionState,
  isEvolutionConfigured,
} from '@/lib/whatsapp/evolution';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const evolutionConfigured = isEvolutionConfigured();

    if (!evolutionConfigured) {
      const creds = await getWhatsAppCredentials(businessId);
      return NextResponse.json({
        provider: creds?.provider || null,
        connected: !!creds && creds.provider === 'meta',
        phoneNumber: creds?.phoneNumber || null,
        evolutionConfigured: false,
      });
    }

    let qrCodeBase64: string | undefined;
    const { state, phoneNumber } = await getConnectionState(businessId);
    const connected = state === 'open';

    if (connected && phoneNumber) {
      await saveEvolutionCredentials({
        businessId,
        phoneNumber,
        connectionState: state,
      });
    } else if (state === 'close' || state === 'connecting') {
      try {
        const qr = await ensureInstanceAndGetQr(businessId);
        qrCodeBase64 = qr.qrCodeBase64;
      } catch (e) {
        console.warn('[whatsapp/status] QR fetch:', e);
      }
    }

    const creds = await getWhatsAppCredentials(businessId);

    return NextResponse.json({
      provider: 'evolution' as const,
      connected,
      phoneNumber: phoneNumber || creds?.phoneNumber || null,
      state,
      qrCodeBase64,
      evolutionConfigured: true,
    });
  } catch (error) {
    console.error('[whatsapp/status] Error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

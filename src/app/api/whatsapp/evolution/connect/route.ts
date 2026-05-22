/**
 * Start Evolution API WhatsApp pairing (create instance + QR).
 */
import { NextRequest, NextResponse } from 'next/server';
import { ensureInstanceAndGetQr, getConnectionState } from '@/lib/whatsapp/evolution';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const existing = await getConnectionState(businessId);
    if (existing.state === 'open') {
      return NextResponse.json({
        connected: true,
        state: existing.state,
        phoneNumber: existing.phoneNumber,
      });
    }

    const qr = await ensureInstanceAndGetQr(businessId);
    const state = await getConnectionState(businessId);

    return NextResponse.json({
      connected: state.state === 'open',
      state: state.state,
      phoneNumber: state.phoneNumber,
      qrCodeBase64: qr.qrCodeBase64,
      pairingCode: qr.pairingCode,
    });
  } catch (error) {
    console.error('[whatsapp/evolution/connect] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to connect';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

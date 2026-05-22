import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessStaff } from '@/lib/api/businessStaffAuth';
import { sendWhatsApp, formatPhoneNumber } from '@/lib/messaging/whatsapp';
import { getConnectionState, isEvolutionConfigured } from '@/lib/whatsapp/evolution';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, to, text } = body as {
      businessId?: string;
      to?: string;
      text?: string;
    };

    if (!businessId || !to || !text || typeof text !== 'string') {
      return NextResponse.json({ error: 'businessId, to and text are required' }, { status: 400 });
    }

    const staff = await verifyBusinessStaff(request, businessId);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isEvolutionConfigured()) {
      return NextResponse.json(
        { error: 'Evolution API não configurada no servidor.' },
        { status: 503 }
      );
    }

    const { state } = await getConnectionState(businessId);
    if (state !== 'open') {
      return NextResponse.json(
        { error: 'WhatsApp desconectado. Escaneie o QR code em Admin > WhatsApp.' },
        { status: 400 }
      );
    }

    const normalizedTo = formatPhoneNumber(to);
    const result = await sendWhatsApp({
      businessId,
      to: normalizedTo,
      text: text.trim(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send message' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('[whatsapp/tenant/send] Error:', error);
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
  }
}

/**
 * Send WhatsApp text message via Meta Cloud API (v21.0)
 * Platform admin only. Uses WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN from env.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/auth/verifyPlatformAdmin';
import { sendWhatsApp, formatPhoneNumber } from '@/lib/messaging/whatsapp';
import { saveOutboundMessage } from '@/lib/whatsapp/messages';

export async function POST(request: NextRequest) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to, text } = body;

    if (!to || !text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'to and text are required' },
        { status: 400 }
      );
    }

    const normalizedTo = formatPhoneNumber(to);
    const result = await sendWhatsApp({
      to: normalizedTo,
      text: text.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 400 }
      );
    }

    const messageId = result.messageId || `out-${Date.now()}`;
    try {
      await saveOutboundMessage({
        toPhone: normalizedTo,
        text: text.trim(),
        messageId,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('[WhatsApp Send] Failed to save outbound message:', err);
    }

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error) {
    console.error('[WhatsApp Send] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}

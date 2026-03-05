/**
 * Send WhatsApp text message via Meta Cloud API (v21.0)
 * Platform admin only. Uses WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN from env.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import { sendWhatsApp, formatPhoneNumber } from '@/lib/messaging/whatsapp';

async function verifyPlatformAdmin(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await auth.verifyIdToken(token);
      return decoded.platformAdmin === true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const isAdmin = await verifyPlatformAdmin(request);
  if (!isAdmin) {
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

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('[WhatsApp Send] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}

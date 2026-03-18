/**
 * GET /api/whatsapp/messages?phone=+5511999999999
 * Fetch messages for a conversation (platform admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import { getMessages } from '@/lib/whatsapp/messages';

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

export async function GET(request: NextRequest) {
  const isAdmin = await verifyPlatformAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json(
      { error: 'phone query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const messages = await getMessages(phone);
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        text: m.text,
        isOutgoing: m.direction === 'outbound',
        timestamp: m.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[WhatsApp messages] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

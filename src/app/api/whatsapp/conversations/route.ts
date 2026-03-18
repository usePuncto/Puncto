/**
 * GET /api/whatsapp/conversations
 * List platform WhatsApp conversations (platform admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import { listConversations } from '@/lib/whatsapp/messages';

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

  try {
    const conversations = await listConversations();
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[WhatsApp conversations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

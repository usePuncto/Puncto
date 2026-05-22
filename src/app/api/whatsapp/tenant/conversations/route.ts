import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessStaff } from '@/lib/api/businessStaffAuth';
import { getConnectionState, findEvolutionChats, isEvolutionConfigured } from '@/lib/whatsapp/evolution';
import { listBusinessConversations } from '@/lib/whatsapp/messages';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 });
  }

  const staff = await verifyBusinessStaff(request, businessId);
  if (!staff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stored = await listBusinessConversations(businessId);
    const byPhone = new Map(
      stored.map((c) => [
        c.phoneId,
        {
          phone: c.phone,
          phoneId: c.phoneId,
          remoteJid: c.remoteJid || `${c.phoneId}@s.whatsapp.net`,
          lastMessagePreview: c.lastMessagePreview,
          lastMessageAt: c.lastMessageAt.toISOString(),
          contactName: c.contactName,
        },
      ])
    );

    if (isEvolutionConfigured()) {
      const { state } = await getConnectionState(businessId);
      if (state === 'open') {
        const evolutionChats = await findEvolutionChats(businessId);
        for (const chat of evolutionChats) {
          const existing = byPhone.get(chat.phoneId);
          if (!existing || new Date(chat.lastMessageAt) > new Date(existing.lastMessageAt)) {
            byPhone.set(chat.phoneId, {
              phone: chat.phone,
              phoneId: chat.phoneId,
              remoteJid: chat.remoteJid,
              lastMessagePreview: chat.lastMessagePreview || existing?.lastMessagePreview || '',
              lastMessageAt: chat.lastMessageAt.toISOString(),
              contactName: chat.contactName || existing?.contactName,
            });
          } else if (!existing.contactName && chat.contactName) {
            byPhone.set(chat.phoneId, {
              ...existing,
              remoteJid: existing.remoteJid || chat.remoteJid,
              contactName: chat.contactName,
            });
          }
        }
      }
    }

    const conversations = Array.from(byPhone.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[whatsapp/tenant/conversations] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

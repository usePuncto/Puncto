import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessStaff } from '@/lib/api/businessStaffAuth';
import {
  fetchEvolutionMessagesPage,
  getConnectionState,
  isEvolutionConfigured,
  resolveRemoteJidForPhone,
} from '@/lib/whatsapp/evolution';
import { getBusinessMessages } from '@/lib/whatsapp/messages';

const PAGE_SIZE = 25;

function mergeMessages(
  stored: Array<{ id: string; text: string; isOutgoing: boolean; timestamp: string }>,
  evolution: Array<{ id: string; text: string; isOutgoing: boolean; timestamp: string }>
) {
  const merged = new Map<string, (typeof stored)[0]>();
  for (const m of stored) merged.set(m.id, m);
  for (const m of evolution) merged.set(m.id, m);
  return Array.from(merged.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  const phone = searchParams.get('phone');
  let remoteJid = searchParams.get('remoteJid');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(10, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE), 10) || PAGE_SIZE)
  );

  if (!businessId || !phone) {
    return NextResponse.json({ error: 'businessId and phone required' }, { status: 400 });
  }

  const staff = await verifyBusinessStaff(request, businessId);
  if (!staff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (isEvolutionConfigured()) {
      const { state } = await getConnectionState(businessId);
      if (state === 'open') {
        if (!remoteJid) {
          remoteJid = await resolveRemoteJidForPhone(businessId, phone);
        }
        if (remoteJid) {
          const result = await fetchEvolutionMessagesPage(businessId, remoteJid, page, pageSize);
          const evolutionMsgs = result.messages.map((m) => ({
            id: m.id,
            text: m.text,
            isOutgoing: m.direction === 'outbound',
            timestamp: m.timestamp.toISOString(),
          }));

          let messages = evolutionMsgs;
          if (page === 1) {
            const stored = await getBusinessMessages(businessId, phone);
            const storedMsgs = stored.map((m) => ({
              id: m.id,
              text: m.text,
              isOutgoing: m.direction === 'outbound',
              timestamp: m.timestamp.toISOString(),
            }));
            messages = mergeMessages(storedMsgs, evolutionMsgs);
          }

          return NextResponse.json({
            messages,
            page: result.page,
            totalPages: result.totalPages,
            total: result.total,
            hasMore: result.hasMore,
            remoteJid,
          });
        }
      }
    }

    const stored = await getBusinessMessages(businessId, phone);
    const messages = stored.map((m) => ({
      id: m.id,
      text: m.text,
      isOutgoing: m.direction === 'outbound',
      timestamp: m.timestamp.toISOString(),
    }));

    return NextResponse.json({
      messages,
      page: 1,
      totalPages: 1,
      total: messages.length,
      hasMore: false,
    });
  } catch (error) {
    console.error('[whatsapp/tenant/messages] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

/**
 * Evolution API webhooks (messages + connection updates).
 * Configure via instance create or Evolution global webhook pointing here with ?businessId=
 */
import { NextRequest, NextResponse } from 'next/server';
import { saveEvolutionCredentials } from '@/lib/whatsapp/credentials';
import { saveInboundMessage } from '@/lib/whatsapp/messages';
import { businessIdFromEvolutionInstance } from '@/lib/whatsapp/instanceName';

function extractTextFromMessage(msg: Record<string, unknown>): string {
  const message = msg.message as Record<string, unknown> | undefined;
  if (!message) return '';
  if (typeof message.conversation === 'string') return message.conversation;
  const ext = message.extendedTextMessage as { text?: string } | undefined;
  if (ext?.text) return ext.text;
  const img = message.imageMessage as { caption?: string } | undefined;
  if (img?.caption) return img.caption;
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let businessId = searchParams.get('businessId');

    const body = await request.json();
    const event = (body.event || body.type || '') as string;
    const instanceName = (body.instance || body.instanceName || '') as string;

    if (!businessId && instanceName) {
      businessId = businessIdFromEvolutionInstance(instanceName);
    }

    if (!businessId) {
      return NextResponse.json({ received: true });
    }

    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      const data = body.data as Record<string, unknown> | undefined;
      const state = (data?.state || data?.status || body.state) as string | undefined;
      if (state === 'open') {
        const phone =
          (data?.phoneNumber as string) ||
          (typeof data?.wuid === 'string' ? data.wuid.replace(/@.*$/, '') : undefined);
        const formatted = phone
          ? phone.startsWith('+')
            ? phone
            : `+${phone.replace(/\D/g, '')}`
          : undefined;
        await saveEvolutionCredentials({
          businessId,
          connectionState: 'open',
          phoneNumber: formatted,
        });
      }
      return NextResponse.json({ received: true });
    }

    if (
      event === 'messages.upsert' ||
      event === 'MESSAGES_UPSERT' ||
      event === 'messages.set'
    ) {
      const data = body.data;
      const messages = Array.isArray(data) ? data : data ? [data] : [];

      for (const item of messages) {
        const msg = item as Record<string, unknown>;
        const key = msg.key as { fromMe?: boolean; remoteJid?: string; id?: string } | undefined;
        if (key?.fromMe) continue;

        const remoteJid = key?.remoteJid || '';
        if (!remoteJid || remoteJid.includes('@g.us')) continue;

        const senderPhone = remoteJid.replace(/@.*$/, '');
        const text = extractTextFromMessage(msg);
        if (!text) continue;

        const messageId = key?.id || `in-${Date.now()}`;
        const ts = (msg.messageTimestamp as number) || Date.now() / 1000;

        await saveInboundMessage({
          senderPhone,
          text,
          messageId,
          timestamp: new Date(ts * 1000),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[whatsapp/evolution/webhook] Error:', error);
    return NextResponse.json({ received: true });
  }
}

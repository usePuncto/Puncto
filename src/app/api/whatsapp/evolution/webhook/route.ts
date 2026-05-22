/**
 * Evolution API webhooks (messages + connection updates).
 * Configure via instance create or Evolution global webhook pointing here with ?businessId=
 */
import { NextRequest, NextResponse } from 'next/server';
import { saveEvolutionCredentials } from '@/lib/whatsapp/credentials';
import { saveInboundMessage, saveOutboundMessage } from '@/lib/whatsapp/messages';
import { businessIdFromEvolutionInstance } from '@/lib/whatsapp/instanceName';

import { extractTextFromEvolutionRecord } from '@/lib/whatsapp/messageContent';

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
        const key = msg.key as {
          fromMe?: boolean;
          remoteJid?: string;
          remoteJidAlt?: string;
          id?: string;
        } | undefined;

        const remoteJid = key?.remoteJid || '';
        if (!remoteJid || remoteJid.includes('@g.us')) continue;

        const keyAlt = key?.remoteJidAlt;
        const peerPhone = keyAlt
          ? keyAlt.replace(/@.*$/, '').replace(/\D/g, '')
          : remoteJid.replace(/@.*$/, '').replace(/\D/g, '');
        const text = extractTextFromEvolutionRecord(msg);
        if (!text) continue;

        const messageId = key?.id || `${key?.fromMe ? 'out' : 'in'}-${Date.now()}`;
        const rawTs = msg.messageTimestamp as number | undefined;
        const ts =
          typeof rawTs === 'number'
            ? rawTs > 1e12
              ? rawTs
              : rawTs * 1000
            : Date.now();

        if (key?.fromMe) {
          await saveOutboundMessage({
            businessId,
            toPhone: peerPhone,
            text,
            messageId,
            timestamp: new Date(ts),
          });
        } else {
          await saveInboundMessage({
            businessId,
            senderPhone: peerPhone,
            text,
            messageId,
            timestamp: new Date(ts),
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[whatsapp/evolution/webhook] Error:', error);
    return NextResponse.json({ received: true });
  }
}

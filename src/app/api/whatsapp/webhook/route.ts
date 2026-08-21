/**
 * Meta WhatsApp Cloud API Webhook
 * Handles verification (GET) and incoming messages (POST).
 * Configure this URL in Meta App Dashboard: Webhooks > WhatsApp > Callback URL
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { saveInboundMessage } from '@/lib/whatsapp/messages';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * GET - Meta's webhook verification
 * Meta sends: hub.mode, hub.verify_token, hub.challenge
 * Must return hub.challenge if verify_token matches
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader?.startsWith('sha256=')) {
    return false;
  }
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const provided = signatureHeader.slice('sha256='.length);
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST - Receive incoming WhatsApp messages from Meta
 * Parses Meta Graph API JSON, extracts sender phone, message text, timestamp.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Always verify when secret is configured; in production require the secret
    if (!process.env.META_APP_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[whatsapp/webhook] META_APP_SECRET is required in production');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
      }
    } else if (!verifyMetaSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody || '{}');

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ received: true });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        for (const msg of value?.messages || []) {
          const senderPhone = msg.from;
          const msgId = msg.id;
          const timestampMs = msg.timestamp ? parseInt(msg.timestamp, 10) * 1000 : Date.now();
          const timestamp = new Date(timestampMs);
          let messageText = '';

          if (msg.type === 'text' && msg.text?.body) {
            messageText = msg.text.body;
          } else if (msg.type === 'interactive' && msg.interactive) {
            const interactive = msg.interactive;
            if (interactive.type === 'button_reply') {
              messageText = interactive.button_reply?.title || '[Button]';
            } else if (interactive.type === 'list_reply') {
              messageText = interactive.list_reply?.title || '[List selection]';
            }
          } else {
            messageText = `[${msg.type}]`;
          }

          try {
            await saveInboundMessage({
              senderPhone,
              text: messageText,
              messageId: msgId,
              timestamp,
            });
          } catch (err) {
            console.error('[WhatsApp Webhook] Failed to save message:', err);
          }
        }

        for (const status of value?.statuses || []) {
          // eslint-disable-next-line no-console
          console.log('[WhatsApp Webhook] Status update:', status);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

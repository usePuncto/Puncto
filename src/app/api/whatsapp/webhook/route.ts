/**
 * Meta WhatsApp Cloud API Webhook
 * Handles verification (GET) and incoming messages (POST).
 * Configure this URL in Meta App Dashboard: Webhooks > WhatsApp > Callback URL
 */
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

/**
 * POST - Receive incoming WhatsApp messages from Meta
 * Parses Meta Graph API JSON, extracts sender phone, message text, timestamp.
 * console.log for now; can be extended to persist or broadcast.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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

        // status_updates (delivery, read, etc.) - log if needed
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

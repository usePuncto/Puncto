/**
 * WhatsApp send for Firebase Functions
 * Uses per-business credentials from Firestore (business_whatsapp_credentials)
 * or env vars WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN as fallback.
 */
import { getFirestore } from 'firebase-admin/firestore';

const CREDENTIALS_COLLECTION = 'business_whatsapp_credentials';

function formatPhoneToE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
  if (!withoutLeadingZero.startsWith('55')) {
    return `55${withoutLeadingZero}`;
  }
  return withoutLeadingZero;
}

export interface SendWhatsAppOptions {
  to: string;
  text?: string;
  template?: string;
  templateParams?: string[];
  businessId?: string;
}

export async function sendWhatsApp(
  options: SendWhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let phoneNumberId: string;
  let accessToken: string;

  if (options.businessId) {
    const db = getFirestore();
    const credsDoc = await db.collection(CREDENTIALS_COLLECTION).doc(options.businessId).get();
    if (!credsDoc.exists) {
      return {
        success: false,
        error: 'WhatsApp not connected for this business',
      };
    }
    const data = credsDoc.data()!;
    phoneNumberId = data.phoneNumberId;
    accessToken = data.accessToken;
  } else {
    phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    if (!phoneNumberId || !accessToken) {
      return {
        success: false,
        error: 'WhatsApp credentials not configured',
      };
    }
  }

  const to = formatPhoneToE164(options.to);

  let payload: Record<string, unknown>;
  if (options.template) {
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: options.template,
        language: { code: 'pt_BR' },
        components: options.templateParams
          ? [
              {
                type: 'body',
                parameters: options.templateParams.map((p: string) => ({
                  type: 'text',
                  text: p,
                })),
              },
            ]
          : undefined,
      },
    };
  } else if (options.text) {
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: options.text },
    };
  } else {
    return { success: false, error: 'Either template or text required' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { messages?: { id: string }[]; error?: { message?: string } };

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || 'WhatsApp API error',
      };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

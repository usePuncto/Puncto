/**
 * WhatsApp send for Firebase Functions (Evolution API or Meta Cloud API).
 */
import { getFirestore } from 'firebase-admin/firestore';
import { isEvolutionConfigured, getConnectionState, sendEvolutionText } from './evolution';
import { templateParamsToText } from './messageText';

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
  if (options.businessId) {
    const db = getFirestore();
    const credsDoc = await db.collection(CREDENTIALS_COLLECTION).doc(options.businessId).get();
    if (!credsDoc.exists) {
      return { success: false, error: 'WhatsApp not connected for this business' };
    }
    const data = credsDoc.data()!;
    const isEvolution =
      data.provider === 'evolution' || (!data.phoneNumberId && data.instanceName);

    if (isEvolution && isEvolutionConfigured()) {
      const { state } = await getConnectionState(options.businessId);
      if (state !== 'open') {
        return { success: false, error: 'WhatsApp disconnected — scan QR in admin' };
      }

      let text = options.text;
      if (!text && options.template) {
        text = templateParamsToText(options.template, options.templateParams);
      }
      if (!text) {
        return { success: false, error: 'Text message required for Evolution send' };
      }

      const to = formatPhoneToE164(options.to);
      return sendEvolutionText(options.businessId, to, text);
    }

    const phoneNumberId = data.phoneNumberId as string;
    const accessToken = data.accessToken as string;
    if (!phoneNumberId || !accessToken) {
      return { success: false, error: 'WhatsApp credentials incomplete' };
    }
    return sendViaMeta(phoneNumberId, accessToken, options);
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp credentials not configured' };
  }
  return sendViaMeta(phoneNumberId, accessToken, options);
}

async function sendViaMeta(
  phoneNumberId: string,
  accessToken: string,
  options: SendWhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
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
      return { success: false, error: data.error?.message || 'WhatsApp API error' };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

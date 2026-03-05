/**
 * WhatsApp Business API client
 * Uses Meta Cloud API (WhatsApp Business Platform)
 *
 * Per-business credentials (Embedded Signup): when businessId is provided,
 * fetches phone_number_id and access_token from Firestore (business_whatsapp_credentials).
 *
 * Fallback: env vars WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (single-tenant / Puncto support).
 */

import { getWhatsAppCredentials } from '@/lib/whatsapp/credentials';

export interface WhatsAppOptions {
  to: string; // Phone number in E.164 format (e.g., +5511999999999)
  template?: string; // Template name
  templateParams?: string[]; // Template parameters
  text?: string; // Plain text message (if not using template)
  businessAccountId?: string;
  /** When set, uses this business's WhatsApp (Embedded Signup). Otherwise uses env vars. */
  businessId?: string;
}

/**
 * Send WhatsApp message via Meta Cloud API
 * Uses per-business credentials when businessId is provided (Embedded Signup)
 */
export async function sendWhatsApp(
  options: WhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let phoneNumberId: string;
  let accessToken: string;

  if (options.businessId) {
    const creds = await getWhatsAppCredentials(options.businessId);
    if (!creds) {
      return {
        success: false,
        error: 'WhatsApp not connected for this business. Connect in Settings > WhatsApp.',
      };
    }
    phoneNumberId = creds.phoneNumberId;
    accessToken = creds.accessToken;
  } else {
    phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    if (!phoneNumberId || !accessToken) {
      return {
        success: false,
        error: 'WhatsApp not configured. Set env vars or connect business via Embedded Signup.',
      };
    }
  }

  try {
    let payload: any;

    if (options.template) {
      payload = {
        messaging_product: 'whatsapp',
        to: options.to,
        type: 'template',
        template: {
          name: options.template,
          language: { code: 'pt_BR' },
          components: options.templateParams
            ? [
                {
                  type: 'body',
                  parameters: options.templateParams.map((param) => ({
                    type: 'text',
                    text: param,
                  })),
                },
              ]
            : undefined,
        },
      };
    } else if (options.text) {
      payload = {
        messaging_product: 'whatsapp',
        to: options.to,
        type: 'text',
        text: { body: options.text },
      };
    } else {
      throw new Error('Either template or text must be provided');
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] API Error:', data);
      return { success: false, error: data.error?.message || 'Failed to send WhatsApp message' };
    }

    return { success: true, messageId: data.messages[0]?.id };
  } catch (error: any) {
    console.error('[WhatsApp] Error sending message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
  if (!withoutLeadingZero.startsWith('55')) {
    return `+55${withoutLeadingZero}`;
  }
  return `+${withoutLeadingZero}`;
}

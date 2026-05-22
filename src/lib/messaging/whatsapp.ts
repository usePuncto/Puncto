/**
 * WhatsApp messaging: Evolution API (Baileys) per business, optional Meta Cloud API fallback.
 */

import { getWhatsAppCredentials } from '@/lib/whatsapp/credentials';
import {
  getConnectionState,
  isEvolutionConfigured,
  sendEvolutionText,
} from '@/lib/whatsapp/evolution';
import { templateParamsToText } from '@/lib/whatsapp/messageText';
import { saveOutboundMessage } from '@/lib/whatsapp/messages';

export interface WhatsAppOptions {
  to: string;
  template?: string;
  templateParams?: string[];
  text?: string;
  businessAccountId?: string;
  businessId?: string;
}

export async function sendWhatsApp(
  options: WhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (options.businessId) {
    const creds = await getWhatsAppCredentials(options.businessId);
    if (!creds) {
      return {
        success: false,
        error: 'WhatsApp não conectado. Conecte em Admin > WhatsApp.',
      };
    }

    if (creds.provider === 'evolution' || (!creds.phoneNumberId && creds.instanceName)) {
      if (!isEvolutionConfigured()) {
        return { success: false, error: 'Evolution API não configurada no servidor.' };
      }
      const { state } = await getConnectionState(options.businessId);
      if (state !== 'open') {
        return {
          success: false,
          error: 'WhatsApp desconectado. Escaneie o QR code em Admin > WhatsApp.',
        };
      }

      let text = options.text;
      if (!text && options.template) {
        text = templateParamsToText(options.template, options.templateParams);
      }
      if (!text) {
        return { success: false, error: 'Mensagem de texto obrigatória para envio automático.' };
      }

      const to = formatPhoneNumber(options.to);
      const result = await sendEvolutionText(options.businessId, to, text);
      if (result.success && options.businessId) {
        try {
          await saveOutboundMessage({
            businessId: options.businessId,
            toPhone: to,
            text,
            messageId: result.messageId || `out-${Date.now()}`,
            timestamp: new Date(),
          });
        } catch (err) {
          console.error('[sendWhatsApp] Failed to persist outbound message:', err);
        }
      }
      return result;
    }

    return sendViaMetaCloud(creds.phoneNumberId!, creds.accessToken!, options);
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  if (!phoneNumberId || !accessToken) {
    return {
      success: false,
      error: 'WhatsApp não configurado no servidor.',
    };
  }
  return sendViaMetaCloud(phoneNumberId, accessToken, options);
}

async function sendViaMetaCloud(
  phoneNumberId: string,
  accessToken: string,
  options: WhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    let payload: Record<string, unknown>;

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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WhatsApp] Error sending message:', error);
    return { success: false, error: msg };
  }
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
  if (!withoutLeadingZero.startsWith('55')) {
    return `+55${withoutLeadingZero}`;
  }
  return `+${withoutLeadingZero}`;
}

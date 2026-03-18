/**
 * ZeptoMail email sender for Firebase Functions
 * Uses same API as main app: https://api.zeptomail.com/v1.1/email
 */

const ZEPTOMAIL_API_URL = 'https://api.zeptomail.com/v1.1/email';

export interface ZeptoEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send email via ZeptoMail API.
 * Requires ZEPTOMAIL_API_KEY, ZEPTOMAIL_FROM_EMAIL (optional), ZEPTOMAIL_FROM_NAME (optional)
 * in Firebase Functions config / environment.
 */
export async function sendZeptoEmail(
  options: ZeptoEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY;
  const fromConfig = process.env.ZEPTOMAIL_FROM_EMAIL || process.env.ZEPTOMAIL_FROM_ADDRESS || 'noreply@puncto.app';
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'Puncto';

  if (!apiKey) {
    return { success: false, error: 'ZEPTOMAIL_API_KEY is not configured' };
  }

  const fromAddress = options.from || fromConfig;
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const toPayload = toList.map((addr) => ({
    email_address: { address: addr, name: addr.split('@')[0] },
  }));

  const body: Record<string, unknown> = {
    from: { address: fromAddress, name: fromName },
    to: toPayload,
    subject: options.subject,
  };

  if (options.html) {
    body.htmlbody = options.html;
  }
  if (options.text) {
    body.textbody = options.text;
  }
  if (!body.htmlbody && !body.textbody) {
    body.textbody = options.subject;
  }
  if (options.replyTo) {
    body.reply_to = [{ address: options.replyTo, name: '' }];
  }

  try {
    const response = await fetch(ZEPTOMAIL_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Zoho-enczapikey ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { request_id?: string; error?: { message?: string } };

    if (!response.ok) {
      const errMsg = (data?.error as { message?: string })?.message || 'Failed to send email';
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: (data as { request_id?: string }).request_id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

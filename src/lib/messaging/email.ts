/**
 * Email messaging client
 * Supports ZeptoMail (default), Resend, and Mailgun providers
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /** Optional recipient name(s) - for ZeptoMail format */
  toNames?: string | string[];
}

const ZEPTOMAIL_API_URL = 'https://api.zeptomail.com/v1.1/email';

/**
 * Resolve which provider to use. Priority:
 * 1. EMAIL_PROVIDER env (zeptomail, resend, mailgun)
 * 2. If ZEPTOMAIL_API_KEY set → zeptomail
 * 3. If RESEND_API_KEY set → resend
 * 4. Fallback: zeptomail
 */
function getProvider(): 'zeptomail' | 'resend' | 'mailgun' {
  const env = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (env === 'zeptomail' || env === 'resend' || env === 'mailgun') return env;
  if (process.env.ZEPTOMAIL_API_KEY) return 'zeptomail';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) return 'mailgun';
  return 'zeptomail';
}

/**
 * Send email via ZeptoMail, Resend, or Mailgun
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider = getProvider();

  if (provider === 'zeptomail') {
    return sendViaZeptoMail(options);
  } else if (provider === 'resend') {
    return sendViaResend(options);
  } else if (provider === 'mailgun') {
    return sendViaMailgun(options);
  }

  throw new Error(`Unknown email provider: ${provider}`);
}

/**
 * Send email via ZeptoMail (Zoho)
 * API: https://www.zoho.com/zeptomail/help/api/email-sending.html
 */
async function sendViaZeptoMail(options: EmailOptions) {
  const apiKey = process.env.ZEPTOMAIL_API_KEY;
  const fromConfig = process.env.ZEPTOMAIL_FROM_EMAIL || process.env.ZEPTOMAIL_FROM_ADDRESS || 'noreply@puncto.app';
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'Puncto';

  if (!apiKey) {
    throw new Error('ZEPTOMAIL_API_KEY is not configured');
  }

  const fromAddress = options.from || fromConfig;
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const toNamesList = options.toNames
    ? (Array.isArray(options.toNames) ? options.toNames : [options.toNames])
    : toList.map((e) => e.split('@')[0]);

  const toPayload = toList.map((addr, i) => ({
    email_address: { address: addr, name: toNamesList[i] || addr.split('@')[0] },
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
    body.textbody = options.subject; // fallback
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
    console.error('[ZeptoMail] Error sending email:', error);
    return { success: false, error: msg };
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(options: EmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const from = options.from || process.env.RESEND_FROM_EMAIL || 'noreply@puncto.app';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to send email' };
    }

    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('[Resend] Error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email via Mailgun
 */
async function sendViaMailgun(options: EmailOptions) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    throw new Error('MAILGUN_API_KEY and MAILGUN_DOMAIN must be configured');
  }

  const from = options.from || `noreply@${domain}`;

  try {
    const formData = new FormData();
    formData.append('from', from);
    if (Array.isArray(options.to)) {
      options.to.forEach((to) => formData.append('to', to));
    } else {
      formData.append('to', options.to);
    }
    formData.append('subject', options.subject);
    if (options.html) formData.append('html', options.html);
    if (options.text) formData.append('text', options.text);
    if (options.replyTo) formData.append('h:Reply-To', options.replyTo);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to send email' };
    }

    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('[Mailgun] Error sending email:', error);
    return { success: false, error: error.message };
  }
}

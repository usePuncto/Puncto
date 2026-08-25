import { createHmac, timingSafeEqual } from 'crypto';

function unsubscribeSecret(): string {
  const secret =
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CALENDAR_LINK_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return 'puncto-dev-newsletter-secret';
  }
  throw new Error('NEWSLETTER_UNSUBSCRIBE_SECRET or CALENDAR_LINK_SECRET required');
}

export function signNewsletterUnsubscribeToken(email: string): string {
  return createHmac('sha256', unsubscribeSecret())
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

export function verifyNewsletterUnsubscribeToken(
  email: string,
  token: string | null
): boolean {
  if (!token || token.length < 16) return false;
  try {
    const expected = signNewsletterUnsubscribeToken(email);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(token, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

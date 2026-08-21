import { createHmac, timingSafeEqual } from 'crypto';

const DEV_FALLBACK = 'puncto-dev-calendar-secret';

function calendarSecret(): string {
  const configured = process.env.CALENDAR_LINK_SECRET?.trim();
  if (configured && configured.length >= 32) {
    return configured;
  }
  if (process.env.NODE_ENV !== 'production') {
    return DEV_FALLBACK;
  }
  throw new Error(
    'CALENDAR_LINK_SECRET must be set in production (minimum 32 characters)'
  );
}

/** Signed token for public .ics download links (email / “add to calendar”). */
export function signCalendarAccess(businessId: string, bookingId: string): string {
  return createHmac('sha256', calendarSecret())
    .update(`${businessId}:${bookingId}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyCalendarAccess(
  businessId: string,
  bookingId: string,
  token: string | null | undefined
): boolean {
  if (!token || token.length < 16) return false;
  try {
    const expected = signCalendarAccess(businessId, bookingId);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(token, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

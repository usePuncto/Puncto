/**
 * Ensures Checkout success/cancel URLs stay on allowed app origins (anti open-redirect / phishing).
 */
export function isAllowedCheckoutRedirectUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let allowedHost: string;
  try {
    allowedHost = new URL(appUrl).hostname.toLowerCase();
  } catch {
    allowedHost = 'localhost';
  }

  const host = parsed.hostname.toLowerCase();
  if (host === allowedHost) return true;
  if (host === 'localhost' || host === '127.0.0.1') return true;

  // Allow tenant subdomains of the configured app host (e.g. slug.app.com)
  if (allowedHost.includes('.') && host.endsWith(`.${allowedHost}`)) {
    return true;
  }

  return false;
}

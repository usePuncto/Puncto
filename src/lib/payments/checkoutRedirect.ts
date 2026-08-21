/**
 * Ensures Checkout / portal return URLs stay on allowed app origins.
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
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const appIsLocal = allowedHost === 'localhost' || allowedHost === '127.0.0.1';

  // Only allow localhost redirects when the configured app itself is local (dev)
  if (isLocalHost) {
    return appIsLocal && parsed.protocol === 'http:';
  }

  if (host === allowedHost) {
    // Production must use https when app URL is https
    if (appUrl.startsWith('https:') && parsed.protocol !== 'https:') return false;
    return true;
  }

  // Allow tenant subdomains of the configured app host (e.g. slug.puncto.com.br)
  if (allowedHost.includes('.') && host.endsWith(`.${allowedHost}`)) {
    if (appUrl.startsWith('https:') && parsed.protocol !== 'https:') return false;
    return true;
  }

  return false;
}

/**
 * Reject webhook callback URLs that could be used for SSRF
 * (localhost, private networks, cloud metadata, non-HTTP(S)).
 */
export function validateOutboundWebhookUrl(rawUrl: string): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Webhook URL must use http or https' };
  }

  // Prefer HTTPS in production; allow http only for localhost in development
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol === 'http:' && host !== 'localhost' && host !== '127.0.0.1') {
    return { ok: false, error: 'Webhook URL must use https' };
  }

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
    return { ok: false, error: 'Webhook URL cannot target localhost' };
  }

  if (host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, error: 'Webhook URL cannot target internal hosts' };
  }

  // Block cloud metadata endpoints
  if (
    host === 'metadata.google.internal' ||
    host === 'metadata' ||
    host === '169.254.169.254' ||
    host === 'metadata.azure.com'
  ) {
    return { ok: false, error: 'Webhook URL cannot target metadata endpoints' };
  }

  if (isPrivateOrReservedIp(host)) {
    return { ok: false, error: 'Webhook URL cannot target private or reserved IPs' };
  }

  return { ok: true };
}

function isPrivateOrReservedIp(host: string): boolean {
  // IPv4 dotted decimal only (hostname resolution not performed here)
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) {
    // Block obvious IPv6 locals
    if (host.includes(':')) {
      const h = host.replace(/^\[|\]$/g, '');
      if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
        return true;
      }
    }
    return false;
  }

  const parts = ipv4.slice(1).map((p) => Number(p));
  if (parts.some((n) => n > 255)) return true;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

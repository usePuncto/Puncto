/**
 * Allow only same-origin relative paths (open-redirect hardening).
 * Rejects protocol-relative URLs, absolute URLs, and backslash tricks.
 */
export function safeReturnUrl(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\')) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return fallback;
  return trimmed;
}

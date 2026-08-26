/**
 * Cookie options for auth/tenant context shared across Puncto hosts.
 * Production *.puncto.com.br: Domain=.puncto.com.br so www → *.gestao keeps session.
 */

export const SESSION_COOKIE_NAME = '__session';
export const BUSINESS_SLUG_COOKIE = 'x-business-slug';

function shouldShareAcrossPunctoDomain(requestHost?: string | null): boolean {
  const host = (requestHost || '').split(':')[0].toLowerCase();
  if (host === 'puncto.com.br' || host.endsWith('.puncto.com.br')) {
    return true;
  }
  // Serverless on Vercel production (Host may be *.vercel.app behind Cloudflare)
  if (process.env.VERCEL_ENV === 'production') {
    return true;
  }
  return false;
}

export function authCookieBaseOptions(
  maxAge: number,
  requestHost?: string | null
) {
  const opts: {
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    maxAge: number;
    domain?: string;
  } = {
    path: '/',
    httpOnly: true,
    secure:
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL_ENV === 'production' ||
      shouldShareAcrossPunctoDomain(requestHost),
    sameSite: 'lax',
    maxAge,
  };
  if (shouldShareAcrossPunctoDomain(requestHost)) {
    opts.domain = '.puncto.com.br';
  }
  return opts;
}

/** Clear cookie both with and without Domain (covers legacy host-only cookies). */
export function clearAuthCookieOptions() {
  const secure =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const base = {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    maxAge: 0,
  };
  return [{ ...base }, { ...base, domain: '.puncto.com.br' }];
}

/**
 * Cookie options for auth/tenant context shared across Puncto hosts.
 * Production: domain=.puncto.com.br so www → *.gestao.puncto.com.br keeps session.
 * Preview/dev: host-only (no Domain) — .puncto.com.br would break *.vercel.app.
 */

export const SESSION_COOKIE_NAME = '__session';
export const BUSINESS_SLUG_COOKIE = 'x-business-slug';

const isProdSharedDomain =
  process.env.VERCEL_ENV === 'production' ||
  (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL?.includes('vercel.app'));

export function authCookieBaseOptions(maxAge: number) {
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
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  };
  if (isProdSharedDomain) {
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

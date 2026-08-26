'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import {
  SUBSCRIPTION_ENDED_MESSAGE,
  SUBSCRIPTION_ENDED_SUPPORT_HINT,
} from '@/lib/business/subscription-access';
import {
  fetchBusinessAccessBlocked,
  signOutAndClearSession,
} from '@/lib/business/check-subscription-client';
import { safeReturnUrl } from '@/lib/navigation/safeReturnUrl';

function getRedirectUrl(
  user: { type?: string; primaryBusinessId?: string; businessId?: string; customClaims?: { primaryBusinessId?: string } } | null,
  explicitReturnUrl: string | null,
  subdomain: string | null
): string {
  const safe = safeReturnUrl(explicitReturnUrl, '');
  // Never honor marketing returnUrls for business login (e.g. /industries from gestao bounce)
  const safeStaffReturn =
    safe &&
    (safe.startsWith('/tenant/') || safe.startsWith('/professional'))
      ? safe
      : '';
  if (safeStaffReturn) {
    return safeStaffReturn;
  }
  if (user?.type === 'business_user') {
    const businessId =
      subdomain ||
      user.primaryBusinessId ||
      user.businessId ||
      user.customClaims?.primaryBusinessId;
    if (businessId) {
      return `/tenant/admin/dashboard?subdomain=${businessId}`;
    }
  }
  return '/';
}

function isLocalOrPreviewHost(): boolean {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return (
    h.includes('localhost') ||
    h.includes('127.0.0.1') ||
    h.includes('ngrok') ||
    h.endsWith('.vercel.app') ||
    h.endsWith('.puncto.local')
  );
}

/** Resolve production gestao URL (or local query-based path). */
async function resolvePostLoginHref(
  businessKey: string,
  path: string
): Promise<string> {
  const cleanPath = path.includes('?') ? path.split('?')[0] : path;
  const staffPath =
    cleanPath.startsWith('/tenant/professional')
      ? cleanPath
      : cleanPath.startsWith('/tenant/time-clock')
        ? cleanPath
        : '/tenant/admin/dashboard';

  if (typeof window !== 'undefined' && window.location.hostname.includes('.gestao.')) {
    return staffPath;
  }

  if (isLocalOrPreviewHost()) {
    return `${staffPath}?subdomain=${encodeURIComponent(businessKey)}&app=gestao`;
  }

  try {
    const res = await fetch(
      `/api/tenant/resolve-host?key=${encodeURIComponent(businessKey)}`,
      { credentials: 'include' }
    );
    if (res.ok) {
      const data = (await res.json()) as { slug?: string };
      const slug = (data.slug || businessKey).trim();
      return `https://${slug}.gestao.puncto.com.br${staffPath}`;
    }
  } catch {
    // fall through
  }
  return `https://${businessKey}.gestao.puncto.com.br${staffPath}`;
}

export default function LoginPage() {
  const { login, loading, user, getBusinessRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subdomain = searchParams.get('subdomain');
  const returnUrlParam = searchParams.get('returnUrl');
  const appParam = searchParams.get('app');
  const subscriptionEnded = searchParams.get('subscriptionEnded') === '1';
  const authBounce = searchParams.get('authBounce') === '1';
  const returnUrl =
    (() => {
      const safe = safeReturnUrl(returnUrlParam, '');
      if (safe && (safe.startsWith('/tenant/') || safe.startsWith('/professional'))) {
        return safe;
      }
      return '';
    })() ||
    (subdomain
      ? `/tenant/admin/dashboard?subdomain=${subdomain}${appParam === 'gestao' ? '&app=gestao' : ''}`
      : '/tenant/admin/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRedirected = useRef(false);
  const manualSubmitRef = useRef(false);
  const bounceMsgShown = useRef(false);

  function resolveBusinessKey(
    u: { primaryBusinessId?: string; businessId?: string; customClaims?: { primaryBusinessId?: string } } | null,
    hostSubdomain: string | null
  ): string | null {
    return (
      hostSubdomain ||
      u?.primaryBusinessId ||
      u?.businessId ||
      u?.customClaims?.primaryBusinessId ||
      null
    );
  }

  async function blockIfSubscriptionEnded(businessKey: string | null): Promise<boolean> {
    if (!businessKey) return false;
    const blocked = await fetchBusinessAccessBlocked(businessKey);
    if (!blocked) return false;
    await signOutAndClearSession();
    setError(SUBSCRIPTION_ENDED_MESSAGE);
    return true;
  }

  useEffect(() => {
    if (!subscriptionEnded) return;
    setError(SUBSCRIPTION_ENDED_MESSAGE);
    if (user && !loading) {
      signOutAndClearSession();
    }
  }, [subscriptionEnded, user, loading]);

  // Guest option only for customers (booking flow), not for business admins/employees
  const isCustomerContext =
    returnUrlParam != null &&
    !returnUrlParam.startsWith('/tenant/admin') &&
    !returnUrlParam.startsWith('/admin');

  /** Set shared session + slug cookies; sync Auth claims from Firestore when needed. */
  async function ensureSyncedSession(businessKey: string): Promise<{
    ok: boolean;
    slug: string | null;
    gestaoHost: string | null;
    error?: string;
  }> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { ok: false, slug: null, gestaoHost: null, error: 'Sessão Firebase ausente' };
    }

    const post = async (idToken: string) => {
      const res = await fetch('/api/auth/sync-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, businessId: businessKey }),
        credentials: 'include',
      });
      return { res, data: await res.json().catch(() => ({})) };
    };

    let idToken = await firebaseUser.getIdToken(true);
    let { res, data } = await post(idToken);

    if (data?.needsTokenRefresh) {
      idToken = await firebaseUser.getIdToken(true);
      ({ res, data } = await post(idToken));
    }

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        slug: null,
        gestaoHost: null,
        error: data?.error || data?.message || `Falha ao criar sessão (${res.status})`,
      };
    }

    return {
      ok: true,
      slug: typeof data.slug === 'string' ? data.slug : null,
      gestaoHost: typeof data.gestaoHost === 'string' ? data.gestaoHost : null,
    };
  }

  async function redirectToTenant(targetUrl: string, businessId: string) {
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    const synced = await ensureSyncedSession(businessId);
    if (!synced.ok) {
      hasRedirected.current = false;
      setError(
        synced.error ||
          'Não foi possível abrir o painel. Confirme que sua conta tem permissão de gestão e tente novamente.'
      );
      return;
    }

    const cleanPath = targetUrl.includes('?') ? targetUrl.split('?')[0] : targetUrl;
    const staffPath = cleanPath.startsWith('/tenant/professional')
      ? cleanPath
      : cleanPath.startsWith('/tenant/time-clock')
        ? cleanPath
        : '/tenant/admin/dashboard';

    if (typeof window !== 'undefined' && window.location.hostname.includes('.gestao.')) {
      window.location.href = staffPath;
      return;
    }

    if (isLocalOrPreviewHost()) {
      const key = synced.slug || businessId;
      window.location.href = `${staffPath}?subdomain=${encodeURIComponent(key)}&app=gestao`;
      return;
    }

    if (synced.gestaoHost) {
      window.location.href = `https://${synced.gestaoHost}${staffPath}`;
      return;
    }

    // Last resort: resolve slug client-side
    const href = await resolvePostLoginHref(businessId, staffPath);
    window.location.href = href;
  }

  // Redirect if already logged in (blocked when authBounce=1 unless user just submitted the form)
  useEffect(() => {
    if (!user || loading || hasRedirected.current) return;

    if (authBounce && !manualSubmitRef.current) {
      if (!bounceMsgShown.current) {
        bounceMsgShown.current = true;
        setError(
          'A sessão entre www e o painel precisa ser sincronizada. Informe e-mail e senha e clique em Entrar.'
        );
      }
      return;
    }

    // Use user.type (from Firestore) - customClaims may not be on user object
    if (user.type === 'business_user') {
      const businessId = resolveBusinessKey(
        user as { primaryBusinessId?: string; businessId?: string; customClaims?: { primaryBusinessId?: string } },
        subdomain
      );

      if (!businessId) {
        hasRedirected.current = true;
        router.push(returnUrl);
        return;
      }

      void blockIfSubscriptionEnded(businessId).then((blocked) => {
        if (blocked) return;

        const role = getBusinessRole(businessId);
        const isProfessional = role === 'professional';
        const targetUrl =
          isProfessional && (returnUrl.startsWith('/tenant/admin') || returnUrl === '/tenant/admin/dashboard')
            ? '/tenant/professional'
            : returnUrl;

        const isTenantContext =
          subdomain ||
          appParam === 'gestao' ||
          (typeof window !== 'undefined' && window.location.hostname.includes('.gestao.'));
        const effectiveTarget =
          targetUrl.startsWith('/tenant') || returnUrl === '/' || returnUrl === ''
            ? isProfessional
              ? '/tenant/professional'
              : '/tenant/admin/dashboard'
            : targetUrl;

        if (isTenantContext && effectiveTarget.startsWith('/tenant')) {
          redirectToTenant(effectiveTarget, businessId);
          return;
        }

        if (
          (returnUrl.startsWith('/tenant') || returnUrl.includes('subdomain=')) &&
          targetUrl.startsWith('/tenant')
        ) {
          redirectToTenant(targetUrl, businessId);
          return;
        }

        hasRedirected.current = true;
        router.push(returnUrl);
      });
      return;
    }

    const url = getRedirectUrl(user, returnUrlParam, subdomain);
    if (url.startsWith('/tenant/admin') || url.startsWith('/tenant?') || (returnUrlParam && returnUrlParam.startsWith('/tenant'))) {
      const match = url.match(/subdomain=([^&]+)/) || (returnUrlParam && returnUrlParam.match(/subdomain=([^&]+)/));
      const businessId =
        match?.[1] ||
        subdomain ||
        ((user as { primaryBusinessId?: string; businessId?: string; customClaims?: { primaryBusinessId?: string } }).primaryBusinessId ||
          (user as { businessId?: string }).businessId ||
          (user as { customClaims?: { primaryBusinessId?: string } }).customClaims?.primaryBusinessId);

      if (businessId) {
        void redirectToTenant(url, businessId);
        return;
      }
    }

    hasRedirected.current = true;
    router.push(url);
  }, [user, loading, router, returnUrl, returnUrlParam, subdomain, appParam, getBusinessRole, authBounce]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    manualSubmitRef.current = true;
    hasRedirected.current = false;

    // Drop authBounce from the URL so a refresh doesn't soft-lock again
    if (typeof window !== 'undefined' && authBounce) {
      const url = new URL(window.location.href);
      url.searchParams.delete('authBounce');
      window.history.replaceState({}, '', url.toString());
    }

    try {
      await login(email, password);

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setError('Login concluído, mas a sessão Firebase não ficou disponível. Tente novamente.');
        return;
      }

      // Force refresh so sync-session sees latest custom claims
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const claims = tokenResult.claims as {
        primaryBusinessId?: string;
        businessRoles?: Record<string, string>;
        userType?: string;
      };

      const businessKey =
        subdomain ||
        claims.primaryBusinessId ||
        (claims.businessRoles ? Object.keys(claims.businessRoles)[0] : null) ||
        user?.primaryBusinessId ||
        '';

      if (businessKey && (await blockIfSubscriptionEnded(businessKey))) {
        return;
      }

      const role = businessKey ? getBusinessRole(businessKey) : null;
      const target =
        role === 'professional' ? '/tenant/professional' : '/tenant/admin/dashboard';

      await redirectToTenant(target, businessKey);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
      manualSubmitRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">Puncto Business</h1>
          <p className="mt-2 text-neutral-600">Acesse a gestão do seu negócio</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="seu@negocio.com"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  Senha
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-neutral-700">
                Manter conectado
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                <p>{error}</p>
                {error === SUBSCRIPTION_ENDED_MESSAGE && (
                  <p className="mt-2 text-red-700">
                    Suporte:{' '}
                    <a href={`mailto:${SUBSCRIPTION_ENDED_SUPPORT_HINT}`} className="font-medium underline">
                      {SUBSCRIPTION_ENDED_SUPPORT_HINT}
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Link to Signup */}
          <div className="mt-6 text-center text-sm text-neutral-600">
            Ainda não tem uma conta?{' '}
            <Link
              href="https://www.puncto.com.br/industries"
              className="text-blue-600 hover:underline font-medium"
            >
              Conhecer soluções
            </Link>
          </div>
        </div>

        {/* Customer Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-600">
            É cliente de um negócio?{' '}
            <Link
              href="/auth/customer/login"
              className="text-blue-600 hover:underline font-medium"
            >
              Entrar como cliente
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

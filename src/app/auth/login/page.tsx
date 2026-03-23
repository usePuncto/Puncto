'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';

function getRedirectUrl(
  user: { type?: string; primaryBusinessId?: string; businessId?: string; customClaims?: { primaryBusinessId?: string } } | null,
  explicitReturnUrl: string | null,
  subdomain: string | null
): string {
  if (explicitReturnUrl && explicitReturnUrl !== '/') {
    return explicitReturnUrl;
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

export default function LoginPage() {
  const { login, loading, user, getBusinessRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subdomain = searchParams.get('subdomain');
  const returnUrlParam = searchParams.get('returnUrl');
  const appParam = searchParams.get('app');
  const returnUrl =
    returnUrlParam ||
    (subdomain ? `/tenant/admin/dashboard?subdomain=${subdomain}${appParam === 'gestao' ? '&app=gestao' : ''}` : '/tenant/admin/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRedirected = useRef(false);

  // Guest option only for customers (booking flow), not for business admins/employees
  const isCustomerContext =
    returnUrlParam != null &&
    !returnUrlParam.startsWith('/tenant/admin') &&
    !returnUrlParam.startsWith('/admin');

  /** Set __session cookie so middleware recognizes auth on full page load (prevents redirect loop) */
  async function ensureSessionCookie(): Promise<void> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    try {
      const idToken = await firebaseUser.getIdToken(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });
    } catch {
      // Continue redirect even if session setup fails
    }
  }

  async function redirectToTenant(targetUrl: string, businessId: string) {
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    await ensureSessionCookie();

    try {
      await fetch('/api/tenant/set-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
        credentials: 'include',
      });
    } catch {
      // Continue redirect even if set-context fails (cookie may already be set)
    }

    // On gestao subdomain: use /tenant/admin/dashboard (middleware normalizes and rewrites correctly)
    const isGestaoDomain = typeof window !== 'undefined' && window.location.hostname.includes('.gestao.');
    const path = isGestaoDomain
      ? '/tenant/admin/dashboard'
      : (targetUrl.includes('?') ? targetUrl.split('?')[0] : targetUrl);

    window.location.href = path;
  }

  // Redirect if already logged in
  useEffect(() => {
    if (!user || loading || hasRedirected.current) return;

    // Use user.type (from Firestore) - customClaims may not be on user object
    if (user.type === 'business_user') {
      const businessId =
        subdomain ||
        (user as { primaryBusinessId?: string; businessId?: string }).primaryBusinessId ||
        (user as { primaryBusinessId?: string; businessId?: string }).businessId;

      if (!businessId) {
        hasRedirected.current = true;
        router.push(returnUrl);
        return;
      }

      const role = getBusinessRole(businessId);
      const isProfessional = role === 'professional';
      const targetUrl =
        isProfessional && (returnUrl.startsWith('/tenant/admin') || returnUrl === '/tenant/admin/dashboard')
          ? '/tenant/professional'
          : returnUrl;

      // When subdomain or app=gestao: use redirectToTenant (full page load) so cookie is set and subdomain works
      // This fixes returnUrl="/" where router.push would fail on gestao subdomains
      const isTenantContext = subdomain || appParam === 'gestao' || (typeof window !== 'undefined' && window.location.hostname.includes('.gestao.'));
      const effectiveTarget = (targetUrl.startsWith('/tenant') || returnUrl === '/' || returnUrl === '')
        ? (isProfessional ? '/tenant/professional' : '/tenant/admin/dashboard')
        : targetUrl;

      if (isTenantContext && effectiveTarget.startsWith('/tenant')) {
        redirectToTenant(effectiveTarget, businessId);
        return;
      }

      if ((returnUrl.startsWith('/tenant') || returnUrl.includes('subdomain=')) && targetUrl.startsWith('/tenant')) {
        redirectToTenant(targetUrl, businessId);
        return;
      }

      hasRedirected.current = true;
      router.push(returnUrl);
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
        hasRedirected.current = true;
        ensureSessionCookie()
          .then(() =>
            fetch('/api/tenant/set-context', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId }),
              credentials: 'include',
            })
          )
          .catch(() => {})
          .finally(() => {
            const isGestaoDomain = typeof window !== 'undefined' && window.location.hostname.includes('.gestao.');
            const path = isGestaoDomain ? '/tenant/admin/dashboard' : (url.includes('?') ? url.split('?')[0] : '/tenant/admin/dashboard');
            window.location.href = path;
          });
        return;
      }
    }

    hasRedirected.current = true;
    router.push(url);
  }, [user, loading, router, returnUrl, returnUrlParam, subdomain, appParam, getBusinessRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);

      // Set session cookie immediately (like platform login) so middleware sees auth on redirect.
      // Must happen in handleSubmit, before useEffect redirect, to avoid race/loop.
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(true);
          const sessionRes = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
            credentials: 'include',
          });
          if (!sessionRes.ok) {
            console.warn('[Login] Failed to set session cookie:', await sessionRes.text());
          }
        } catch (err) {
          console.warn('[Login] Session cookie setup failed:', err);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
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
                {error}
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
              href="/industries"
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

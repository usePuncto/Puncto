'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function BusinessLoginPage() {
  const { login, loading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subdomain = searchParams.get('subdomain');
  const returnUrlParam = searchParams.get('returnUrl');
  const returnUrl = returnUrlParam || (subdomain ? `/tenant/admin/dashboard?subdomain=${subdomain}` : '/tenant/admin/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function redirectToTenant(targetUrl: string, businessId: string) {
    await fetch('/api/tenant/set-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
      credentials: 'include',
    });
    const path = targetUrl.includes('?') ? targetUrl.split('?')[0] : targetUrl;
    window.location.href = path;
  }

  // Redirect if already logged in as business user
  useEffect(() => {
    if (!user || loading) return;

    const customClaims = (user as { customClaims?: { userType?: string } }).customClaims;
    if (customClaims?.userType !== 'business_user') return;

    const businessId =
      subdomain ||
      (user as { primaryBusinessId?: string; businessId?: string }).primaryBusinessId ||
      (user as { primaryBusinessId?: string; businessId?: string }).businessId;

    if (businessId && (returnUrl.startsWith('/tenant') || returnUrl.includes('subdomain='))) {
      redirectToTenant(returnUrl, businessId);
      return;
    }

    router.push(returnUrl);
  }, [user, loading, router, returnUrl, subdomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // User state updates async via onAuthStateChanged - useEffect will handle redirect with set-context
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
                  href="/auth/forgot-password"
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
              href="/auth/business/signup"
              className="text-blue-600 hover:underline font-medium"
            >
              Cadastrar negócio
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

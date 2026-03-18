'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';

export default function PlatformAdminLoginPage() {
  const { login, loading, user, isPlatformAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/platform/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in as platform admin
  useEffect(() => {
    if (user && !loading && isPlatformAdmin) {
      const url = new URL(returnUrl, window.location.origin);
      url.searchParams.set('subdomain', 'primazia');
      router.push(url.pathname + url.search);
    } else if (user && !loading && !isPlatformAdmin) {
      setError('Acesso negado. Esta área é restrita a administradores da plataforma.');
    }
  }, [user, loading, isPlatformAdmin, router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);

      // login() doesn't return the user; get claims from current auth state
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setError('Erro ao verificar permissões. Tente novamente.');
        return;
      }
      // Force refresh so custom claims (platformAdmin) are up to date
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const platformAdmin = tokenResult.claims?.platformAdmin === true;

      if (!platformAdmin) {
        setError('Acesso negado. Esta conta não possui permissões de administrador da plataforma.');
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        return;
      }

      // Set session cookie so middleware recognizes auth on the next page load
      const idToken = await firebaseUser.getIdToken(true);
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });
      if (!sessionRes.ok) {
        setError('Erro ao configurar sessão. Tente novamente.');
        return;
      }

      // Redirect using full navigation
      const url = new URL(returnUrl, window.location.origin);
      url.searchParams.set('subdomain', 'primazia');
      window.location.assign(url.pathname + url.search);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-700 border-t-white mx-auto"></div>
          <p className="mt-4 text-neutral-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-800 mb-4">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Puncto Platform</h1>
          <p className="mt-2 text-neutral-400">Área restrita - Administradores</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl bg-neutral-800 p-8 shadow-2xl border border-neutral-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="mt-1 w-full rounded-xl border border-neutral-600 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                placeholder="admin@puncto.com.br"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-neutral-600 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Security Notice */}
            <div className="rounded-xl bg-yellow-900/30 border border-yellow-700/50 px-4 py-3">
              <div className="flex gap-2">
                <svg
                  className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="text-xs text-yellow-200">
                  <p className="font-medium">Área de segurança máxima</p>
                  <p className="mt-1 text-yellow-300/80">
                    Acesso restrito apenas a administradores autorizados da plataforma Puncto.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Verificando credenciais...' : 'Acessar Plataforma'}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-500">
              Problemas de acesso? Entre em contato com o administrador do sistema.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-neutral-600">
            © 2026 Puncto. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CustomerSignupPage() {
  const { signup, loading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push(returnUrl);
    }
  }, [user, loading, router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setError('Você deve aceitar os termos de uso e política de privacidade');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password, displayName);
      // Customer accounts redirect to returnUrl (booking page or profile)
      router.push(returnUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Puncto</h1>
          <p className="mt-2 text-neutral-600">Crie sua conta para agendar</p>
        </div>

        {/* Signup Form */}
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700">
                Nome completo
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="João Silva"
                autoComplete="name"
              />
            </div>

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
                className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Mínimo 6 caracteres
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">As senhas não coincidem</p>
              )}
            </div>

            {/* LGPD Consent */}
            <div className="space-y-3 border-t border-neutral-200 pt-4">
              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="terms" className="text-xs text-neutral-700">
                  Aceito os{' '}
                  <a href="/legal/terms" target="_blank" className="text-blue-600 hover:underline">
                    Termos de Uso
                  </a>{' '}
                  <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="privacy"
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="privacy" className="text-xs text-neutral-700">
                  Aceito a{' '}
                  <a href="/legal/privacy" target="_blank" className="text-blue-600 hover:underline">
                    Política de Privacidade
                  </a>{' '}
                  e autorizo o tratamento dos meus dados pessoais conforme LGPD{' '}
                  <span className="text-red-500">*</span>
                </label>
              </div>
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
              disabled={isSubmitting || !displayName || !email || !password || !confirmPassword || !termsAccepted || !privacyAccepted}
              className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-6 text-center text-sm text-neutral-600">
            Já tem uma conta?{' '}
            <Link
              href={`/auth/customer/login${returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="text-blue-600 hover:underline font-medium"
            >
              Entrar
            </Link>
          </div>
        </div>

        {/* Guest Option */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push(returnUrl)}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Continuar como convidado
          </button>
        </div>

        {/* Business Owner Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-600">
            Quer gerenciar um negócio?{' '}
            <Link
              href="/industries"
              className="text-blue-600 hover:underline font-medium"
            >
              Cadastrar negócio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

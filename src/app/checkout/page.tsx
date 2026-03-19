'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/marketing/Logo';

const VALID_PLANS = ['gratis', 'starter', 'growth', 'pro'];
const VALID_INDUSTRIES = ['servicos', 'varejo', 'empresas', 'saude', 'corporativo'];

const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'Letra maiúscula', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'Letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'Número', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Caractere especial (!@#$%^&*...)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
] as const;

function validatePassword(password: string): string | null {
  for (const { label, test } of PASSWORD_REQUIREMENTS) {
    if (!test(password)) return label;
  }
  return null;
}

export default function CheckoutPage() {
  const { user, loading, signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const plan = searchParams.get('plan') || 'gratis';
  const industry = searchParams.get('industry') || 'servicos';
  const billing = searchParams.get('billing') || 'monthly';

  const isValidPlan = VALID_PLANS.includes(plan);
  const isValidIndustry = VALID_INDUSTRIES.includes(industry);
  const isValidBilling = billing === 'monthly' || billing === 'annual';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect logged-in users to onboarding
  useEffect(() => {
    if (loading) return;

    if (user) {
      const params = new URLSearchParams();
      if (isValidPlan) params.set('plan', plan);
      if (isValidIndustry) params.set('industry', industry);
      if (isValidBilling) params.set('billing', billing);
      const queryString = params.toString();
      const onboardingUrl = `/onboarding/business${queryString ? `?${queryString}` : ''}`;
      router.replace(onboardingUrl);
      return;
    }

    if (!isValidPlan || !isValidIndustry) {
      router.replace('/industries');
    }
  }, [user, loading, router, plan, industry, billing, isValidPlan, isValidIndustry, isValidBilling]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(`A senha deve ter: ${passwordError}`);
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setError('Você deve aceitar os termos de uso e política de privacidade');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password, displayName);
      // Full page navigation ensures auth state is settled before business form loads
      const params = new URLSearchParams();
      if (isValidPlan) params.set('plan', plan);
      if (isValidIndustry) params.set('industry', industry);
      if (isValidBilling) params.set('billing', billing);
      const queryString = params.toString();
      window.location.href = `/onboarding/business${queryString ? `?${queryString}` : ''}`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth or redirecting
  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto" />
          <p className="mt-4 text-neutral-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Invalid params - redirecting
  if (!isValidPlan || !isValidIndustry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto" />
          <p className="mt-4 text-neutral-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Show registration form for new users
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo variant="light" />

          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Crie sua conta para continuar
          </h1>
          <p className="mt-1 text-slate-600">
            Você está a um passo de começar com o Puncto
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
                Nome completo
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="João Silva"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {PASSWORD_REQUIREMENTS.map(({ id, label, test }) => (
                  <li
                    key={id}
                    className={test(password) ? 'text-green-600' : ''}
                  >
                    {test(password) ? '✓ ' : '○ '}{label}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">As senhas não coincidem</p>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="terms" className="text-xs text-slate-700">
                  Aceito os{' '}
                  <Link href="/legal/terms" className="text-blue-600 hover:underline">
                    Termos de Uso
                  </Link>{' '}
                  <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="privacy"
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="privacy" className="text-xs text-slate-700">
                  Aceito a{' '}
                  <Link href="/legal/privacy" className="text-blue-600 hover:underline">
                    Política de Privacidade
                  </Link>{' '}
                  e autorizo o tratamento dos meus dados pessoais conforme LGPD{' '}
                  <span className="text-red-500">*</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !displayName ||
                !email ||
                !password ||
                !confirmPassword ||
                !termsAccepted ||
                !privacyAccepted
              }
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Criando conta...' : 'Criar conta e continuar'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Já tem uma conta?{' '}
            <Link
              href={`/auth/login?returnUrl=${encodeURIComponent(`/checkout?plan=${plan}&industry=${industry}&billing=${billing}`)}`}
              className="text-blue-600 hover:underline font-medium"
            >
              Entrar
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/industries" className="text-sm text-slate-400 hover:text-slate-600">
            ← Voltar às indústrias
          </Link>
        </div>
      </div>
    </div>
  );
}

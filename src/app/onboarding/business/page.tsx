'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

const INDUSTRIES = [
  { value: 'salon', label: 'Salão de Beleza' },
  { value: 'clinic', label: 'Clínica/Estética' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'bakery', label: 'Padaria/Confeitaria' },
  { value: 'event', label: 'Eventos' },
  { value: 'general', label: 'Outro' },
  { value: 'education', label: 'Educação' },
];

// Map industry page slugs to onboarding industry values
const INDUSTRY_SLUG_TO_VALUE: Record<string, string> = {
  servicos: 'salon',
  varejo: 'restaurant',
  empresas: 'general',
  saude: 'clinic',
  corporativo: 'general',
  educacao: 'education',
};

export default function OnboardingBusinessPage() {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-selected plan, industry, and billing from checkout/industry pages
  const preselectedPlan = searchParams.get('plan') || '';
  const preselectedIndustrySlug = searchParams.get('industry') || '';
  const preselectedBilling = searchParams.get('billing') || 'monthly';

  // Redirect if not logged in - send to checkout (where they register)
  // Use firebaseUser (not user) - user can be null for new signups before Firestore doc is ready
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push(`/checkout?plan=${preselectedPlan || 'gratis'}&industry=${preselectedIndustrySlug || 'servicos'}&billing=${preselectedBilling || 'monthly'}`);
    }
  }, [firebaseUser, loading, router, preselectedPlan, preselectedIndustrySlug, preselectedBilling]);

  // Redirect if no plan selected (user came directly without choosing a plan)
  useEffect(() => {
    if (!loading && firebaseUser && !preselectedPlan) {
      router.push('/industries');
    }
  }, [loading, firebaseUser, preselectedPlan, router]);

  // Pre-fill email from auth (firebaseUser has it immediately; user may be null for new signups)
  useEffect(() => {
    const emailToUse = firebaseUser?.email || user?.email;
    if (emailToUse) {
      setEmail(emailToUse);
    }
  }, [firebaseUser, user]);

  // Pre-fill industry from industry page slug (only on initial load)
  useEffect(() => {
    if (preselectedIndustrySlug && INDUSTRY_SLUG_TO_VALUE[preselectedIndustrySlug]) {
      setIndustry(INDUSTRY_SLUG_TO_VALUE[preselectedIndustrySlug]);
    }
  }, [preselectedIndustrySlug]);

  const formatTaxId = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      // CPF format: 000.000.000-00
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ format: 00.000.000/0000-00
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      // Landline: (00) 0000-0000
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    } else {
      // Mobile: (00) 00000-0000
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    }
  };

  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTaxId(e.target.value);
    setTaxId(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName || !legalName || !taxId || !email || !phone || !industry) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const plan = preselectedPlan || 'gratis';
    const billingPeriod = preselectedBilling || 'monthly';

    if (!['gratis', 'starter', 'growth', 'pro'].includes(plan)) {
      setError('Plano inválido. Volte e escolha um plano.');
      return;
    }

    if (!firebaseUser) {
      setError('Sessão expirada. Faça login novamente.');
      return;
    }

    setIsSubmitting(true);

    try {
      const businessData = {
        displayName,
        legalName,
        taxId: taxId.replace(/\D/g, ''),
        email,
        phone: phone.replace(/\D/g, ''),
        industry,
        createdBy: user?.id,
      };

      const token = await firebaseUser!.getIdToken();

      // Free plan: create business and redirect to tenant
      if (plan === 'gratis') {
        const response = await fetch('/api/onboarding/create-business-free', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(businessData),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Erro ao criar negócio');
        }

        const { redirectUrl } = await response.json();
        window.location.href = redirectUrl;
        return;
      }

      // Paid plan: create business and redirect to Stripe Checkout (Stripe hosts payment page)
      const response = await fetch('/api/onboarding/create-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...businessData,
          selectedPlan: plan,
          billingPeriod,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao criar negócio');
      }

      const { checkoutUrl } = await response.json();

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('URL de pagamento não foi gerada');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar');
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
      <div className="w-full max-w-2xl">
        {/* Progress Indicator - Plan already chosen on industry page */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white text-sm font-medium">
                1
              </div>
              <span className="ml-2 text-sm font-medium text-neutral-900">Informações do Negócio</span>
            </div>
            <div className="h-px w-12 bg-neutral-300"></div>
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-300 text-neutral-600 text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm text-neutral-600">
                {preselectedPlan === 'gratis' ? 'Concluir' : 'Pagamento (Stripe)'}
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Configure seu Negócio</h1>
          <p className="mt-2 text-neutral-600">
            Vamos começar com as informações básicas do seu negócio
          </p>
        </div>

        {/* Business Form */}
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name */}
              <div className="md:col-span-2">
                <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700">
                  Nome do Negócio <span className="text-red-500">*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Como seu negócio será conhecido"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Este nome será exibido para seus clientes
                </p>
              </div>

              {/* Legal Name */}
              <div className="md:col-span-2">
                <label htmlFor="legalName" className="block text-sm font-medium text-neutral-700">
                  Razão Social <span className="text-red-500">*</span>
                </label>
                <input
                  id="legalName"
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Nome legal registrado da empresa"
                />
              </div>

              {/* Tax ID */}
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-neutral-700">
                  CPF/CNPJ <span className="text-red-500">*</span>
                </label>
                <input
                  id="taxId"
                  type="text"
                  value={taxId}
                  onChange={handleTaxIdChange}
                  required
                  maxLength={18}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="000.000.000-00"
                />
              </div>

              {/* Industry */}
              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-neutral-700">
                  Segmento <span className="text-red-500">*</span>
                </label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="">Selecione...</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  E-mail do Negócio <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="contato@seunegocio.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                  maxLength={15}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/checkout?plan=${preselectedPlan || 'gratis'}&industry=${preselectedIndustrySlug || 'servicos'}&billing=${preselectedBilling || 'monthly'}`
                  )
                }
                className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !displayName || !legalName || !taxId || !email || !phone || !industry}
                className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? 'Processando...'
                  : preselectedPlan === 'gratis'
                    ? 'Criar conta grátis'
                    : 'Ir para pagamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

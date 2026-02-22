'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function OnboardingPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const businessId = searchParams.get('businessId');
  const sessionId = searchParams.get('sessionId');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!businessId) {
      setError('ID do negócio não encontrado');
      setIsLoading(false);
      return;
    }

    // If we have a sessionId, try to retrieve the checkout URL
    if (sessionId) {
      fetchCheckoutUrl();
    } else {
      setError('Sessão de pagamento não encontrada');
      setIsLoading(false);
    }
  }, [user, authLoading, businessId, sessionId, router]);

  const fetchCheckoutUrl = async () => {
    try {
      const response = await fetch(`/api/onboarding/get-checkout-session?sessionId=${sessionId}`);

      if (!response.ok) {
        throw new Error('Não foi possível recuperar a sessão de pagamento');
      }

      const data = await response.json();
      setCheckoutUrl(data.url);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao recuperar sessão de pagamento');
      setIsLoading(false);
    }
  };

  const handleRedirectToCheckout = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <svg
              className="h-10 w-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 text-center mb-4">Erro ao Carregar Pagamento</h2>
          <p className="text-neutral-600 text-center mb-6">{error}</p>
          <button
            onClick={() => router.push('/onboarding/plan')}
            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Voltar para Seleção de Plano
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
          <svg
            className="h-10 w-10 text-yellow-600"
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
        </div>

        <h2 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          Pagamento Pendente
        </h2>
        <p className="text-neutral-600 text-center mb-6">
          Seu negócio foi criado, mas o pagamento ainda não foi confirmado. Complete o pagamento para acessar todas as funcionalidades da plataforma.
        </p>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            Você será redirecionado para a página de pagamento seguro do Stripe. Após a confirmação do pagamento, você terá acesso completo ao seu painel.
          </p>
        </div>

        <button
          onClick={handleRedirectToCheckout}
          disabled={!checkoutUrl}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          Ir para Pagamento
        </button>

        <button
          onClick={() => router.push('/auth/login')}
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Voltar para Login
        </button>
      </div>
    </div>
  );
}

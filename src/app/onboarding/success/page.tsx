'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    async function fetchAndRedirect() {
      try {
        const res = await fetch(`/api/onboarding/get-checkout-session?sessionId=${sessionId}`);
        const data = await res.json();
        if (cancelled) return;

        setStatus('success');

        const businessId = data.businessId;
        const redirectUrl = businessId ? `/tenant/admin/dashboard` : '/';

        redirectTimer = setTimeout(async () => {
          await refreshToken();
          // Set business slug cookie before redirect (middleware may not run for /tenant/*)
          if (businessId) {
            await fetch('/api/tenant/set-context', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId }),
              credentials: 'include',
            });
          }
          if (!cancelled) window.location.href = redirectUrl;
        }, 3000);
      } catch {
        if (cancelled) return;
        setStatus('success');
        setTimeout(() => { window.location.href = '/'; }, 3000);
      }
    }

    fetchAndRedirect();

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [searchParams, refreshToken]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          <h2 className="mt-6 text-2xl font-bold text-neutral-900">Processando pagamento...</h2>
          <p className="mt-2 text-neutral-600">
            Aguarde enquanto confirmamos seu pagamento
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
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
          <h2 className="mt-6 text-2xl font-bold text-neutral-900">Algo deu errado</h2>
          <p className="mt-2 text-neutral-600">
            Não foi possível confirmar seu pagamento. Por favor, tente novamente.
          </p>
          <button
            onClick={() => router.push('/industries')}
            className="mt-6 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Escolher plano novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-neutral-900">Pagamento Confirmado!</h2>
        <p className="mt-2 text-neutral-600">
          Seu negócio foi criado com sucesso. Você será redirecionado para o dashboard em alguns segundos...
        </p>
        <div className="mt-6">
          <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-900 animate-progress" style={{ width: '100%' }}></div>
          </div>
        </div>
        <button
          onClick={async () => {
            const sessionId = searchParams.get('session_id');
            if (sessionId) {
              try {
                const r = await fetch(`/api/onboarding/get-checkout-session?sessionId=${sessionId}`);
                const d = await r.json();
                await refreshToken();
                if (d.businessId) {
                  await fetch('/api/tenant/set-context', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ businessId: d.businessId }),
                    credentials: 'include',
                  });
                }
                window.location.href = d.businessId ? `/tenant/admin/dashboard` : '/';
              } catch {
                window.location.href = '/';
              }
            } else {
              window.location.href = '/';
            }
          }}
          className="mt-6 text-sm text-neutral-600 hover:text-neutral-900 underline"
        >
          Ir para o dashboard agora
        </button>
      </div>
    </div>
  );
}

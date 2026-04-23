'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { StripeElements } from '@stripe/stripe-js';
import { getStripePublishableKey } from '@/lib/stripe/publishable';
import type { StudentSubscription } from '@/types/studentSubscription';

type Phase = 'idle' | 'loading_keys' | 'mounting' | 'ready' | 'submitting' | 'error';

interface IncompleteTuitionPaymentProps {
  businessId: string;
  subscription: StudentSubscription;
  getIdToken: () => Promise<string>;
  /** Nome da escola — reforça contexto no checkout */
  schoolName?: string;
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6V11z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IncompleteTuitionPayment({
  businessId,
  subscription,
  getIdToken,
  schoolName,
}: IncompleteTuitionPaymentProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Awaited<ReturnType<typeof loadStripe>>>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<{ destroy: () => void } | null>(null);

  const formatMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);

  const tuitionAmountLabel =
    typeof subscription.amount === 'number' && subscription.amount > 0
      ? formatMoney(subscription.amount, subscription.currency || 'brl')
      : null;

  const showPaymentStep = phase === 'loading_keys' || phase === 'mounting' || phase === 'ready' || phase === 'submitting';

  const teardown = useCallback(() => {
    try {
      paymentElementRef.current?.destroy();
    } catch {
      /* ignore */
    }
    paymentElementRef.current = null;
    elementsRef.current = null;
    stripeRef.current = null;
    if (shellRef.current) shellRef.current.innerHTML = '';
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const mountElements = async (clientSecret: string, stripeConnectAccountId: string) => {
    setPhase('mounting');
    teardown();
    const shell = shellRef.current;
    if (!shell) throw new Error('Container indisponivel');

    const stripe = await loadStripe(getStripePublishableKey(), { stripeAccount: stripeConnectAccountId });
    if (!stripe) throw new Error('Falha ao carregar Stripe.js');

    const elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          borderRadius: '10px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        },
      },
    });
    const paymentElement = elements.create('payment', { layout: 'tabs' });
    paymentElement.mount(shell);

    stripeRef.current = stripe;
    elementsRef.current = elements;
    paymentElementRef.current = paymentElement;
  };

  const startPayment = async () => {
    setErrorMessage(null);
    setPhase('loading_keys');
    try {
      const token = await getIdToken();
      const res = await fetch('/api/students/subscriptions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'prepare_incomplete_payment',
          businessId,
          subscriptionId: subscription.id,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        clientSecret?: string;
        stripeConnectAccountId?: string;
      };
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Nao foi possivel preparar o pagamento');
      }
      if (!data.clientSecret || !data.stripeConnectAccountId) {
        throw new Error('Resposta invalida do servidor');
      }
      await mountElements(data.clientSecret, data.stripeConnectAccountId);
      setPhase('ready');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Erro ao preparar pagamento');
      setPhase('error');
    }
  };

  const handleConfirm = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) {
      setErrorMessage('Carregue o formulário de pagamento primeiro.');
      return;
    }
    setErrorMessage(null);
    setPhase('submitting');
    try {
      const returnUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });
      if (error) {
        setErrorMessage(error.message ?? 'Pagamento nao concluido');
        setPhase('ready');
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Erro ao confirmar pagamento');
      setPhase('ready');
    }
  };

  if (subscription.status !== 'incomplete') return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm ring-1 ring-black/[0.04]">
      <div className="border-b border-neutral-100 bg-gradient-to-r from-neutral-900 to-neutral-800 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Pagamento seguro</p>
            <h2 className="mt-0.5 text-lg font-semibold text-white sm:text-xl">Ativar mensalidade</h2>
            {schoolName ? <p className="mt-0.5 text-sm text-white/80">{schoolName}</p> : null}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95">
            <LockIcon className="shrink-0 text-emerald-300" />
            Stripe
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 lg:divide-x lg:divide-neutral-100">
        {/* Resumo — coluna estilo “order summary” */}
        <aside className="border-b border-neutral-100 bg-neutral-50/80 p-5 sm:p-6 lg:col-span-5 lg:border-b-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Resumo</p>
          <p className="mt-2 text-sm font-medium text-neutral-900">Assinatura mensal da escola</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Primeira cobrança hoje; as próximas no mesmo cartão, todo mês, até você solicitar cancelamento conforme as
            regras da escola.
          </p>

          {subscription.tuitionTypeName ? (
            <p className="mt-4 text-sm text-neutral-700">
              <span className="text-neutral-500">Plano: </span>
              <span className="font-medium text-neutral-900">{subscription.tuitionTypeName}</span>
            </p>
          ) : null}

          {tuitionAmountLabel ? (
            <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total hoje</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-neutral-900">
                {tuitionAmountLabel}
              </p>
              <p className="mt-1 text-xs text-neutral-500">+ cobranças mensais no mesmo valor</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">O valor será exibido após carregar o pagamento.</p>
          )}

          <ul className="mt-5 space-y-2 text-xs text-neutral-600">
            <li className="flex gap-2">
              <span className="mt-0.5 text-emerald-600" aria-hidden>
                ✓
              </span>
              Dados do cartão tratados pela Stripe (PCI DSS).
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-emerald-600" aria-hidden>
                ✓
              </span>
              Depois de ativo, você gerencia cartão e extrato no portal da mensalidade.
            </li>
          </ul>
        </aside>

        {/* Pagamento */}
        <section className="p-5 sm:p-6 lg:col-span-7">
          <div className="mb-6 flex gap-3 text-sm">
            <div
              className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 ${
                !showPaymentStep || phase === 'error'
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  !showPaymentStep || phase === 'error' ? 'bg-white text-neutral-900' : 'bg-neutral-200 text-neutral-700'
                }`}
              >
                1
              </span>
              <span className="font-medium">Revisar</span>
            </div>
            <div
              className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 ${
                showPaymentStep && phase !== 'error'
                  ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-400'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  showPaymentStep && phase !== 'error'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                2
              </span>
              <span className="font-medium">Pagamento</span>
            </div>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs text-emerald-950">
            <LockIcon className="mt-0.5 shrink-0 text-emerald-700" />
            <span>
              Você está em um checkout protegido. O formulário abaixo é da <strong className="font-semibold">Stripe</strong>
              , parceira de pagamentos da escola.
            </span>
          </div>

          {phase === 'idle' || phase === 'error' ? (
            <button
              type="button"
              onClick={() => void startPayment()}
              className="w-full rounded-xl bg-neutral-900 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.99]"
            >
              Continuar para o pagamento
            </button>
          ) : null}

          {(phase === 'loading_keys' || phase === 'mounting') && (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <div className="h-9 w-9 shrink-0 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
              <div>
                <p className="text-sm font-medium text-neutral-900">Preparando checkout…</p>
                <p className="text-xs text-neutral-500">Isso leva alguns segundos.</p>
              </div>
            </div>
          )}

          <div
            ref={shellRef}
            className={`mt-4 min-h-[140px] rounded-xl border border-neutral-200 bg-white p-4 shadow-inner ${
              phase === 'idle' || phase === 'error' || phase === 'loading_keys' ? 'hidden' : ''
            }`}
          />

          {phase === 'ready' || phase === 'submitting' ? (
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={phase === 'submitting'}
              className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {phase === 'submitting'
                ? 'Processando pagamento…'
                : tuitionAmountLabel
                  ? `Pagar ${tuitionAmountLabel}`
                  : 'Confirmar e ativar mensalidade'}
            </button>
          ) : null}

          {errorMessage ? (
            <p
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

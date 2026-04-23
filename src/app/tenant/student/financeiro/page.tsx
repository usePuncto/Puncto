'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useStudentCustomerProfile, useStudentSubscriptions } from '@/lib/queries/studentPortal';
import { useTuitionTypes } from '@/lib/queries/tuitionTypes';
import { IncompleteTuitionPayment } from '@/components/student/IncompleteTuitionPayment';
import { ensureStudentTuitionSubscription } from '@/lib/student/ensureTuitionSubscription';
import { getStudentCustomerId } from '@/lib/student/studentSession';

const BLOCKING_STATUSES = new Set(['active', 'past_due', 'incomplete', 'pending_checkout']);

function subscriptionStatusLabelPt(status: string | undefined): string {
  if (!status) return 'Sem assinatura ativa';
  const map: Record<string, string> = {
    active: 'Ativa',
    past_due: 'Em atraso',
    incomplete: 'Aguardando primeiro pagamento',
    pending_checkout: 'Aguardando pagamento',
    canceled: 'Cancelada',
  };
  return map[status] ?? status;
}

export default function StudentFinanceiroPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, firebaseUser } = useAuth();
  const { business } = useBusiness();
  const studentCustomerId = getStudentCustomerId(user);
  const isEducation = business?.industry === 'education';

  const {
    data: subscriptions = [],
    refetch: refetchSubs,
    isError: subsError,
    error: subsErrObj,
  } = useStudentSubscriptions(business.id, studentCustomerId);

  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    if (redirectStatus !== 'succeeded' || !searchParams.get('payment_intent')) return;
    if (!firebaseUser || !business?.id || !studentCustomerId) return;

    let cancelled = false;
    void (async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch('/api/students/subscriptions/manage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'sync_from_stripe', businessId: business.id }),
        });
        if (!res.ok && !cancelled) {
          console.warn('[financeiro] sync_from_stripe', await res.text());
        }
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: ['studentSubscriptions', business.id, studentCustomerId] });
        await refetchSubs();
        router.replace('/tenant/student/financeiro');
      } catch (e) {
        if (!cancelled) console.warn('[financeiro] pos-pagamento', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, firebaseUser, business?.id, studentCustomerId, queryClient, router, refetchSubs]);
  const { data: customerProfile, isLoading: profileLoading } = useStudentCustomerProfile(
    business.id,
    studentCustomerId,
  );
  const { data: tuitionTypes = [] } = useTuitionTypes(business.id, isEducation);

  const [ensureLoading, setEnsureLoading] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);

  const hasBlockingSubscription = useMemo(
    () => subscriptions.some((s) => BLOCKING_STATUSES.has(s.status)),
    [subscriptions],
  );

  const assignedTuitionType = useMemo(() => {
    const id = customerProfile?.tuitionTypeId;
    if (!id) return null;
    return tuitionTypes.find((t) => t.id === id) ?? null;
  }, [customerProfile?.tuitionTypeId, tuitionTypes]);

  const showStartTuitionCta =
    isEducation &&
    !profileLoading &&
    Boolean(customerProfile?.tuitionTypeId) &&
    !hasBlockingSubscription;

  const incompleteSubs = subscriptions.filter((s) => s.status === 'incomplete');
  const latestIncompleteSub = incompleteSubs[0] ?? null;
  const hasActiveOrPastDueSubscription = subscriptions.some(
    (s) => s.status === 'active' || s.status === 'past_due',
  );
  const activeSub =
    subscriptions.find((s) => s.status === 'active' || s.status === 'past_due') ||
    subscriptions.find((s) => !BLOCKING_STATUSES.has(s.status) && s.status !== 'canceled') ||
    subscriptions[0];

  const openBillingPortal = async () => {
    if (!firebaseUser || !activeSub) return;
    const token = await firebaseUser.getIdToken();
    const res = await fetch('/api/students/subscriptions/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'portal',
        businessId: business.id,
        subscriptionId: activeSub.id,
      }),
    });
    const data = await res.json();
    if (res.ok && data?.url) window.location.href = data.url;
  };

  const getIdToken = () => {
    if (!firebaseUser) throw new Error('Sessao expirada');
    return firebaseUser.getIdToken();
  };

  const handlePrepareTuition = async () => {
    if (!firebaseUser || !studentCustomerId) return;
    setEnsureError(null);
    setEnsureLoading(true);
    try {
      const result = await ensureStudentTuitionSubscription(getIdToken, {
        businessId: business.id,
        customerId: studentCustomerId,
      });
      if (!result.ok) {
        setEnsureError(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['studentSubscriptions', business.id, studentCustomerId] });
      await refetchSubs();
    } finally {
      setEnsureLoading(false);
    }
  };

  const loadError = (() => {
    if (!subsError || subsErrObj == null) return null;
    return subsErrObj instanceof Error ? subsErrObj.message : String(subsErrObj);
  })();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="border-b border-neutral-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Financeiro</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Mensalidade escolar e assinatura no cartão. Pagamentos são processados com segurança pela Stripe em nome da
          sua escola.
        </p>
      </header>

      {loadError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Não foi possível carregar dados financeiros. Se o problema continuar, saia e entre de novo. ({loadError})
        </p>
      ) : null}

      {showStartTuitionCta && incompleteSubs.length === 0 && (
        <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-white shadow-sm ring-1 ring-blue-900/[0.06]">
          <div className="border-b border-blue-100/80 bg-blue-900/5 px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800/80">Antes do checkout</p>
            <h2 className="mt-1 text-lg font-semibold text-blue-950">Preparar sua mensalidade</h2>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-blue-950/90">
              {assignedTuitionType ? (
                <>
                  Seu plano: <strong className="font-semibold text-blue-950">{assignedTuitionType.name}</strong>
                  {typeof assignedTuitionType.suggestedAmountCents === 'number' &&
                  assignedTuitionType.suggestedAmountCents > 0 ? (
                    <>
                      {' '}
                      <span className="tabular-nums">
                        —{' '}
                        {(assignedTuitionType.suggestedAmountCents / 100).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}{' '}
                        / mês
                      </span>
                    </>
                  ) : null}
                  . No próximo passo você abre o checkout seguro para ativar a cobrança recorrente.
                </>
              ) : (
                <>Sua escola definiu um tipo de mensalidade para você. Continue para abrir o checkout seguro.</>
              )}
            </p>
            <button
              type="button"
              onClick={() => void handlePrepareTuition()}
              disabled={ensureLoading}
              className="mt-5 w-full rounded-xl bg-blue-900 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50 sm:w-auto sm:min-w-[240px]"
            >
              {ensureLoading ? 'Preparando checkout…' : 'Continuar'}
            </button>
            {ensureError ? <p className="mt-3 text-sm text-red-700">{ensureError}</p> : null}
          </div>
        </div>
      )}

      {latestIncompleteSub && firebaseUser && !hasActiveOrPastDueSubscription && (
        <div className="space-y-6">
          <IncompleteTuitionPayment
            key={latestIncompleteSub.id}
            businessId={business.id}
            subscription={latestIncompleteSub}
            getIdToken={getIdToken}
            schoolName={business.displayName}
          />
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Depois do pagamento</p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">Assinatura e cobrança</h2>
        <p className="mt-1 text-sm font-medium text-neutral-800">
          Situação: <span className="text-neutral-950">{subscriptionStatusLabelPt(activeSub?.status)}</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Cobranças mensais da mensalidade, comprovantes e troca do cartão ficam no{' '}
          <span className="font-medium text-neutral-800">portal seguro da Stripe</span>, parceira de pagamentos da
          escola. Use o botão abaixo para ver o extrato da assinatura ou atualizar a forma de pagamento.
        </p>
        <button
          type="button"
          onClick={openBillingPortal}
          disabled={!activeSub || activeSub.status === 'incomplete'}
          className="mt-5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
        >
          Abrir portal da mensalidade
        </button>
        {activeSub?.status === 'incomplete' && (
          <p className="mt-3 text-xs text-neutral-500">
            Conclua a ativação no checkout acima; depois você poderá abrir o portal para gerenciar o cartão e ver o
            histórico de cobranças.
          </p>
        )}
      </div>
    </div>
  );
}

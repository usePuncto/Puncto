'use client';

import { useMemo } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useCustomerEducationOverview } from '@/lib/queries/customerEducationOverview';
import { useTuitionTypes } from '@/lib/queries/tuitionTypes';
import type { Customer } from '@/types/booking';
import type { StudentSubscription } from '@/types/studentSubscription';
import type { Payment } from '@/types/payment';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const weekdaysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatBrl(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = (value as { seconds?: number })?.seconds;
  if (typeof s === 'number') return new Date(s * 1000);
  return null;
}

function isTuitionPayment(p: Payment): boolean {
  return Boolean(
    p.stripeSubscriptionId ||
      p.metadata?.source === 'stripe_invoice_tuition' ||
      (p.description && p.description.toLowerCase().includes('mensalidade')),
  );
}

export function StudentEducationDetailModal({
  customer,
  businessId,
  onClose,
}: {
  customer: Customer;
  businessId: string;
  onClose: () => void;
}) {
  const { business } = useBusiness();
  const { data, isLoading, error } = useCustomerEducationOverview(businessId, customer.id);
  const { data: tuitionTypes = [] } = useTuitionTypes(businessId, true);

  const tuitionTypeName = useMemo(() => {
    if (!customer.tuitionTypeId) return null;
    return tuitionTypes.find((t) => t.id === customer.tuitionTypeId)?.name ?? null;
  }, [customer.tuitionTypeId, tuitionTypes]);

  const tuitionPayments = useMemo(() => {
    const list = (data?.payments ?? []).filter(isTuitionPayment);
    return {
      paid: list.filter((p) => p.status === 'succeeded'),
      failed: list.filter((p) => p.status === 'failed'),
      other: list.filter((p) => p.status !== 'succeeded' && p.status !== 'failed'),
    };
  }, [data?.payments]);

  const primarySub = useMemo(() => {
    const subs = data?.subscriptions ?? [];
    return (
      subs.find((s) => s.status === 'active' || s.status === 'past_due') ?? subs[0] ?? null
    );
  }, [data?.subscriptions]);

  const futureSchedule = useMemo(() => {
    const sub = primarySub;
    if (!sub || sub.status === 'canceled') return [];
    const periodEnd = toDate(sub.currentPeriodEnd);
    if (!periodEnd) return [];
    const out: { label: string; kind: 'next' | 'forecast' }[] = [];
    out.push({
      label: format(periodEnd, "dd/MM/yyyy", { locale: ptBR }),
      kind: sub.status === 'active' || sub.status === 'past_due' ? 'next' : 'forecast',
    });
    for (let i = 1; i <= 3; i++) {
      const d = addMonths(periodEnd, i);
      out.push({
        label: format(d, "dd/MM/yyyy", { locale: ptBR }),
        kind: 'forecast',
      });
    }
    return out;
  }, [primarySub]);

  const hasStripe =
    Boolean(business?.stripeConnectAccountId) && Boolean(business?.stripeConnectOnboardingComplete);

  const scheduleLabel = (turma: { schedules?: { weekday: number; startTime: string; endTime: string }[] }) => {
    const s = turma.schedules;
    if (!s?.length) return '—';
    return s
      .map((slot) => `${weekdaysPt[slot.weekday]} ${slot.startTime}–${slot.endTime}`)
      .join(', ');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {customer.firstName} {customer.lastName}
            </h2>
            <p className="text-sm text-neutral-500">Turmas e mensalidade</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-6">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600">Não foi possível carregar os dados. Tente novamente.</p>
          )}
          {!isLoading && !error && (
            <>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Turmas</h3>
                {!data?.turmas?.length ? (
                  <p className="mt-2 text-sm text-neutral-600">Nenhuma turma vinculada a este aluno.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {data.turmas.map((t) => (
                      <li
                        key={t.id}
                        className="rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-neutral-900">{t.name}</p>
                        <p className="text-neutral-600 text-xs mt-0.5">{scheduleLabel(t)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Tipo de mensalidade
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Catálogo em Pagamentos → Tipos de mensalidade; aqui você escolhe qual plano vale para este aluno
                  no cadastro.
                </p>
                <p className="mt-2 text-sm text-neutral-800">
                  {tuitionTypeName ? (
                    <span className="font-medium">{tuitionTypeName}</span>
                  ) : (
                    <span className="text-neutral-500">Nenhum tipo atribuído a este aluno.</span>
                  )}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Cobrança recorrente (Stripe)
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Contrato de mensalidade com cobrança automática na Stripe. É outro registro além do tipo escolhido
                  acima.
                </p>
                {!data?.subscriptions?.length ? (
                  <p className="mt-2 text-sm text-neutral-600">
                    Nenhuma assinatura na Stripe ainda. Se o tipo acima estiver definido, com valor sugerido no tipo
                    (Pagamentos) e e-mail no cadastro, ao salvar o aluno a cobrança é preparada para o portal; após o
                    1º pagamento do aluno, o status aparece aqui.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {data.subscriptions.map((sub) => (
                      <SubscriptionRow key={sub.id} sub={sub} />
                    ))}
                  </div>
                )}
                {!hasStripe && (
                  <p className="mt-2 text-xs text-amber-800">
                    Conecte o Stripe na área de Pagamentos para que assinaturas e cobranças deste aluno possam ser
                    registradas.
                  </p>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Pagamentos da mensalidade
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Registros vinculados à assinatura ou com descrição de mensalidade.
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-emerald-800">Pagos</p>
                    {tuitionPayments.paid.length === 0 ? (
                      <p className="text-sm text-neutral-500 mt-1">Nenhum ainda.</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-sm">
                        {tuitionPayments.paid.map((p) => (
                          <li key={p.id} className="flex justify-between gap-2 text-neutral-800">
                            <span>
                              {formatBrl(p.amount, p.currency)} —{' '}
                              {p.succeededAt
                                ? format(toDate(p.succeededAt) ?? new Date(), 'dd/MM/yyyy', { locale: ptBR })
                                : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-800">Falhas / não concluídos</p>
                    {tuitionPayments.failed.length === 0 && tuitionPayments.other.length === 0 ? (
                      <p className="text-sm text-neutral-500 mt-1">Nenhum.</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-sm">
                        {[...tuitionPayments.failed, ...tuitionPayments.other].map((p) => (
                          <li key={p.id} className="flex justify-between gap-2 text-neutral-800">
                            <span>
                              {formatBrl(p.amount, p.currency)} — {p.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-700">Situação da cobrança</p>
                    {primarySub?.status === 'incomplete' && (
                      <p className="text-sm text-amber-800 mt-1">
                        Primeiro pagamento ainda não concluído pelo aluno (portal Financeiro).
                      </p>
                    )}
                    {primarySub?.status === 'past_due' && (
                      <p className="text-sm text-red-800 mt-1">Assinatura em atraso — cobrança não foi paga a tempo.</p>
                    )}
                    {primarySub?.status === 'active' && (
                      <p className="text-sm text-emerald-800 mt-1">Assinatura ativa.</p>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Próximas cobranças (previsão)
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  A partir do fim do período atual na Stripe; valores podem mudar se o plano for alterado.
                </p>
                {futureSchedule.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-600">
                    Sem previsão (assinatura inexistente ou sem data de período).
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-neutral-800">
                    {futureSchedule.map((row, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{row.kind === 'next' ? 'Próximo vencimento' : `+${i} mês(es)`}</span>
                        <span className="tabular-nums">{row.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscriptionRow({ sub }: { sub: StudentSubscription }) {
  const end = toDate(sub.currentPeriodEnd);
  const statusPt: Record<string, string> = {
    active: 'Ativa',
    incomplete: 'Aguardando 1º pagamento',
    past_due: 'Em atraso',
    canceled: 'Cancelada',
    pending_checkout: 'Checkout pendente',
  };
  return (
    <div className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
      <div className="flex justify-between gap-2">
        <span className="font-medium text-neutral-900">{statusPt[sub.status] ?? sub.status}</span>
        <span className="tabular-nums">{formatBrlStatic(sub.amount, sub.currency)}</span>
      </div>
      {sub.tuitionTypeName && (
        <p className="text-xs text-neutral-600 mt-1">Tipo: {sub.tuitionTypeName}</p>
      )}
      {end && (
        <p className="text-xs text-neutral-600 mt-1">
          Fim do período atual: {format(end, "dd/MM/yyyy", { locale: ptBR })}
        </p>
      )}
    </div>
  );
}

function formatBrlStatic(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

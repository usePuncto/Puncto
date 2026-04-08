'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { usePayments } from '@/lib/queries/payments';
import { usePaymentLinks } from '@/lib/queries/paymentLinks';
import { useCustomers } from '@/lib/queries/customers';
import { PaymentLinkForm } from '@/components/admin/PaymentLinkForm';
import { PaymentDetailModal } from '@/components/admin/Payments/PaymentDetailModal';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Payment, PaymentLink, PaymentMethod, PaymentStatus } from '@/types/payment';
import type { StudentSubscription } from '@/types/studentSubscription';
import { useAllStudentSubscriptionsForBusiness } from '@/lib/queries/studentSubscriptionsAdmin';

export default function PaymentsAdminPage() {
  const { business } = useBusiness();
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: payments, isLoading } = usePayments(business.id);
  const { data: paymentLinks, isLoading: paymentLinksLoading } = usePaymentLinks(business.id);
  const { data: customers } = useCustomers(business.id);
  const [showPaymentLinkForm, setShowPaymentLinkForm] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [managingStripe, setManagingStripe] = useState(false);
  const [syncingOnboardingStatus, setSyncingOnboardingStatus] = useState(false);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | PaymentStatus>('');
  const [filterMethod, setFilterMethod] = useState<'' | PaymentMethod>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [linkListPage, setLinkListPage] = useState(1);
  const [linksPerPage, setLinksPerPage] = useState(10);
  const [linkingCustomerFor, setLinkingCustomerFor] = useState<PaymentLink | null>(null);
  const [linkCustomerDraft, setLinkCustomerDraft] = useState('');
  const [linkActionLoading, setLinkActionLoading] = useState(false);

  const isEducation = business?.industry === 'education';
  const [educationTab, setEducationTab] = useState<'tuitions' | 'links' | 'history'>('tuitions');
  const { data: studentSubscriptions = [], isLoading: subscriptionsLoading } =
    useAllStudentSubscriptionsForBusiness(business.id, isEducation);
  const [tuitionCustomerId, setTuitionCustomerId] = useState('');
  const [tuitionAmountBrl, setTuitionAmountBrl] = useState('');
  const [tuitionActionLoading, setTuitionActionLoading] = useState(false);

  const customerLabelById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of customers ?? []) {
      m[c.id] = `${c.firstName} ${c.lastName}`.trim() || c.email || c.id;
    }
    return m;
  }, [customers]);

  const hasStripeAccount = Boolean(business.stripeConnectAccountId);
  const isStripeOnboardingComplete = Boolean(business.stripeConnectOnboardingComplete);
  const onboardingParam = searchParams.get('onboarding');

  useEffect(() => {
    const shouldSync = onboardingParam === 'complete' || onboardingParam === 'refresh';
    if (!shouldSync || !business?.id || !hasStripeAccount) return;

    let cancelled = false;

    const syncStatus = async () => {
      setSyncingOnboardingStatus(true);
      try {
        await fetch('/api/stripe-connect/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: business.id }),
        });
      } catch (err) {
        console.error('[payments] Failed to sync Stripe onboarding status:', err);
      } finally {
        if (cancelled) return;
        // Remove onboarding param and refresh server data (BusinessContext payload)
        router.replace(pathname);
        router.refresh();
        setSyncingOnboardingStatus(false);
      }
    };

    syncStatus();

    return () => {
      cancelled = true;
    };
  }, [onboardingParam, business?.id, hasStripeAccount, pathname, router]);

  const handleConnectStripe = async () => {
    const email = typeof business.email === 'string' ? business.email.trim() : '';
    if (!email) {
      alert('Defina o e-mail do negócio nas configurações antes de conectar o Stripe.');
      return;
    }

    setConnectingStripe(true);
    try {
      const res = await fetch('/api/stripe-connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          email,
          country: 'BR',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao conectar Stripe');
      }

      if (data?.onboardingUrl) {
        window.location.href = data.onboardingUrl;
        return;
      }

      if (data?.onboardingComplete) {
        // Onboarding already completed server-side; reload so BusinessContext reflects it.
        window.location.reload();
        return;
      }

      alert('Stripe Connect criado, mas URL de onboarding não retornou.');
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Erro ao conectar Stripe');
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleManageStripe = async () => {
    if (!business?.id) return;
    if (!business.stripeConnectAccountId) {
      alert('A conta Stripe Connect do negócio ainda não foi criada.');
      return;
    }

    setManagingStripe(true);
    try {
      const res = await fetch('/api/stripe-connect/login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data?.onboardingUrl) {
          window.location.href = data.onboardingUrl;
          return;
        }
        throw new Error(data.error || 'Falha ao abrir dashboard do Stripe');
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('A Stripe não retornou uma URL de login.');
      }
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Erro ao abrir dashboard do Stripe');
    } finally {
      setManagingStripe(false);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      succeeded: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      partially_refunded: 'bg-orange-100 text-orange-800',
      canceled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const paymentStatusLabelPt = (status: string) => {
    const map: Record<string, string> = {
      succeeded: 'Pago',
      pending: 'Pendente',
      processing: 'Processando',
      failed: 'Falhou',
      refunded: 'Reembolsado',
      partially_refunded: 'Parcialmente reembolsado',
      canceled: 'Cancelado',
    };
    return map[status] || status;
  };

  const subscriptionStatusLabelPt = (status: string) => {
    const map: Record<string, string> = {
      pending_checkout: 'Aguardando 1º pagamento',
      active: 'Ativa',
      past_due: 'Em atraso',
      canceled: 'Cancelada',
      incomplete: 'Incompleta',
    };
    return map[status] || status;
  };

  const parseBrlToCents = (s: string): number | null => {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = parseFloat(normalized);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  };

  const handleCreateTuition = async () => {
    const cents = parseBrlToCents(tuitionAmountBrl);
    if (!tuitionCustomerId || !cents) {
      alert('Selecione um aluno e informe o valor mensal (ex.: 350 ou 350,50).');
      return;
    }
    if (!firebaseUser) {
      alert('Sessão expirada. Entre novamente.');
      return;
    }
    setTuitionActionLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/students/subscriptions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'create',
          businessId: business.id,
          customerId: tuitionCustomerId,
          amount: cents,
          currency: 'brl',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao criar mensalidade');
      }
      if (typeof data.checkoutUrl === 'string' && data.checkoutUrl) {
        const open = window.confirm(
          'Link de checkout gerado. Abrir em nova aba para copiar a URL ou enviar ao responsável?',
        );
        if (open) window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
      setTuitionAmountBrl('');
      await queryClient.invalidateQueries({ queryKey: ['studentSubscriptions', 'admin', business.id] });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao criar mensalidade');
    } finally {
      setTuitionActionLoading(false);
    }
  };

  const handleCancelTuitionAtPeriodEnd = async (sub: StudentSubscription) => {
    if (!window.confirm('Cancelar a mensalidade ao final do período de cobrança atual?')) return;
    if (!firebaseUser) return;
    setTuitionActionLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/students/subscriptions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'cancel',
          businessId: business.id,
          subscriptionId: sub.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao cancelar');
      }
      await queryClient.invalidateQueries({ queryKey: ['studentSubscriptions', 'admin', business.id] });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao cancelar');
    } finally {
      setTuitionActionLoading(false);
    }
  };

  const formatPaymentInstant = (value: unknown) => {
    if (!value) return '—';
    if (value instanceof Date) {
      return value.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }
    const v = value as { seconds?: number };
    if (typeof v?.seconds === 'number') {
      return new Date(v.seconds * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }
    return '—';
  };

  const handleCreatePaymentLink = async (data: {
    name: string;
    description?: string;
    amount: number;
    currency: string;
    expiresAt?: Date;
  }) => {
    const response = await fetch('/api/payments/create-payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: business.id,
        ...data,
        generateQR: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment link');
    }

    setShowPaymentLinkForm(false);
    await queryClient.invalidateQueries({ queryKey: ['paymentLinks', business.id] });
    await queryClient.invalidateQueries({ queryKey: ['payments', business.id] });
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copiado!');
    } catch {
      prompt('Copie o link abaixo:', text);
    }
  };

  const getExpiresAtDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      'seconds' in value &&
      typeof (value as { seconds?: unknown }).seconds === 'number'
    ) {
      return new Date((value as { seconds: number }).seconds * 1000);
    }
    return null;
  };

  const isLinkExpired = (link: { expiresAt?: unknown }): boolean => {
    const expiresAtDate = getExpiresAtDate(link.expiresAt);
    if (!expiresAtDate) return false;
    return expiresAtDate.getTime() <= Date.now();
  };

  const callPaymentLinkManage = async (payload: {
    businessId: string;
    linkId: string;
    action: 'cancel' | 'setCustomer';
    customerId?: string | null;
  }) => {
    if (!firebaseUser) {
      alert('Sessão expirada. Entre novamente.');
      return;
    }
    const token = await firebaseUser.getIdToken();
    const res = await fetch('/api/payments/payment-links/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Falha na operação');
    }
  };

  const handleCancelPaymentLink = async (link: PaymentLink) => {
    if (!link.active) return;
    if (!window.confirm('Cancelar este link? Ninguém poderá mais pagar por ele.')) return;
    setLinkActionLoading(true);
    try {
      await callPaymentLinkManage({
        businessId: business.id,
        linkId: link.id,
        action: 'cancel',
      });
      await queryClient.invalidateQueries({ queryKey: ['paymentLinks', business.id] });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao cancelar');
    } finally {
      setLinkActionLoading(false);
    }
  };

  const handleSaveLinkedCustomer = async () => {
    if (!linkingCustomerFor) return;
    setLinkActionLoading(true);
    try {
      await callPaymentLinkManage({
        businessId: business.id,
        linkId: linkingCustomerFor.id,
        action: 'setCustomer',
        customerId: linkCustomerDraft || null,
      });
      setLinkingCustomerFor(null);
      await queryClient.invalidateQueries({ queryKey: ['paymentLinks', business.id] });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao vincular');
    } finally {
      setLinkActionLoading(false);
    }
  };

  const toMillis = (value: unknown): number | null => {
    if (!value) return null;
    if (value instanceof Date) return value.getTime();
    const s = (value as { seconds?: number })?.seconds;
    if (typeof s === 'number') return s * 1000;
    return null;
  };

  /** Data usada no filtro de período: pago em (se houver) ou registrado em */
  const getFilterEventMillis = (p: Payment): number | null => {
    if (p.succeededAt) return toMillis(p.succeededAt);
    return toMillis(p.createdAt);
  };

  const linkListTotal = paymentLinks?.length ?? 0;
  const linkListTotalPages = Math.max(1, Math.ceil(linkListTotal / linksPerPage));

  const paginatedPaymentLinks = useMemo(() => {
    if (!paymentLinks?.length) return [];
    const start = (linkListPage - 1) * linksPerPage;
    return paymentLinks.slice(start, start + linksPerPage);
  }, [paymentLinks, linkListPage, linksPerPage]);

  useEffect(() => {
    setLinkListPage(1);
  }, [linksPerPage]);

  useEffect(() => {
    if (linkListPage > linkListTotalPages) {
      setLinkListPage(linkListTotalPages);
    }
  }, [linkListPage, linkListTotalPages, linkListTotal]);

  const filteredPayments = useMemo(() => {
    if (!payments?.length) return [];
    const q = filterSearch.trim().toLowerCase();
    const fromMs = filterDateFrom ? new Date(filterDateFrom + 'T00:00:00').getTime() : null;
    const toMs = filterDateTo ? new Date(filterDateTo + 'T23:59:59.999').getTime() : null;

    return payments.filter((p) => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterMethod && p.paymentMethod !== filterMethod) return false;

      const eventMs = getFilterEventMillis(p);
      if (fromMs !== null && (eventMs === null || eventMs < fromMs)) return false;
      if (toMs !== null && (eventMs === null || eventMs > toMs)) return false;

      if (!q) return true;
      const hay = [
        p.id,
        p.customerEmail,
        p.customerName,
        p.stripePaymentIntentId,
        p.stripeCheckoutSessionId,
        p.stripeChargeId,
        p.bookingId,
        p.stripePaymentLinkStripeId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [payments, filterSearch, filterStatus, filterMethod, filterDateFrom, filterDateTo]);

  const hasSucceededPaymentByLinkId = useMemo(() => {
    const set = new Set<string>();
    for (const p of payments ?? []) {
      if (p.status === 'succeeded' && p.stripePaymentLinkStripeId) {
        set.add(p.stripePaymentLinkStripeId);
      }
    }
    return set;
  }, [payments]);

  const escapeCsvCell = (raw: string) => {
    const s = String(raw ?? '');
    if (/[;\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportPaymentsCsv = () => {
    const sep = ';';
    const headers = [
      'id',
      'status',
      'valor_centavos',
      'moeda',
      'cliente_nome',
      'cliente_email',
      'metodo',
      'registrado_em',
      'pago_em',
      'payment_intent',
      'checkout_session',
      'charge',
    ];
    const rows = filteredPayments.map((p) => [
      p.id,
      p.status,
      String(p.amount),
      p.currency,
      p.customerName || '',
      p.customerEmail || '',
      p.paymentMethod,
      formatPaymentInstant(p.createdAt),
      formatPaymentInstant(p.succeededAt),
      p.stripePaymentIntentId || '',
      p.stripeCheckoutSessionId || '',
      p.stripeChargeId || '',
    ]);
    const body = [headers, ...rows]
      .map((line) => line.map((c) => escapeCsvCell(c)).join(sep))
      .join('\n');
    const bom = '\ufeff';
    const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos-${business.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      {/* Cabeçalho da página */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Pagamentos</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            {isEducation
              ? 'Gerencie mensalidades (assinatura Stripe), links avulsos e o histórico de recebimentos.'
              : 'Conecte o Stripe, crie links para cobrar clientes e acompanhe o que foi pago.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isEducation) {
              if (educationTab !== 'links') {
                setEducationTab('links');
                setShowPaymentLinkForm(true);
              } else {
                setShowPaymentLinkForm((v) => !v);
              }
            } else {
              setShowPaymentLinkForm((v) => !v);
            }
          }}
          className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {isEducation && educationTab !== 'links'
            ? 'Novo link de pagamento'
            : showPaymentLinkForm
              ? 'Fechar formulário'
              : 'Novo link de pagamento'}
        </button>
      </header>

      {/* Stripe Connect — faixa compacta */}
      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Conta Stripe</h2>
            <p className="mt-1 text-sm text-neutral-700">
              {hasStripeAccount && isStripeOnboardingComplete
                ? 'Conta conectada — você pode receber por link e checkout.'
                : hasStripeAccount
                  ? 'Finalize o cadastro na Stripe para começar a receber.'
                  : 'Conecte o Stripe usando o e-mail do negócio nas configurações.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {hasStripeAccount && isStripeOnboardingComplete ? (
              <>
                <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                  Conectado
                </span>
                <button
                  type="button"
                  onClick={handleManageStripe}
                  disabled={managingStripe}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {managingStripe ? 'Abrindo…' : 'Painel Stripe'}
                </button>
              </>
            ) : hasStripeAccount ? (
              <>
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                  {syncingOnboardingStatus ? 'Verificando…' : 'Onboarding pendente'}
                </span>
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {connectingStripe ? 'Abrindo…' : 'Continuar'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {connectingStripe ? 'Conectando…' : 'Conectar Stripe'}
              </button>
            )}
          </div>
        </div>
      </section>

      {isEducation && (
        <div className="-mt-2 flex flex-wrap gap-2 border-b border-neutral-200 pb-px">
          {(
            [
              { id: 'tuitions' as const, label: 'Mensalidades' },
              { id: 'links' as const, label: 'Links de pagamento' },
              { id: 'history' as const, label: 'Histórico de recebimento' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEducationTab(tab.id)}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                educationTab === tab.id
                  ? 'bg-white text-neutral-900 ring-1 ring-neutral-200 ring-b-0'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isEducation && educationTab === 'tuitions' && (
        <section className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Nova mensalidade</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Cria uma assinatura mensal na Stripe para o aluno. Envie o link de checkout gerado ao responsável para
              concluir o pagamento.
            </p>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Aluno</label>
                <select
                  value={tuitionCustomerId}
                  onChange={(e) => setTuitionCustomerId(e.target.value)}
                  disabled={tuitionActionLoading}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {(customers ?? [])
                    .slice()
                    .sort((a, b) =>
                      `${a.firstName} ${a.lastName}`.localeCompare(
                        `${b.firstName} ${b.lastName}`,
                        'pt-BR',
                      ),
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {`${c.firstName} ${c.lastName}`.trim()}
                        {c.email ? ` (${c.email})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div className="w-full min-w-[140px] sm:w-40">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Valor mensal (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="ex.: 350,00"
                  value={tuitionAmountBrl}
                  onChange={(e) => setTuitionAmountBrl(e.target.value)}
                  disabled={tuitionActionLoading}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateTuition}
                disabled={tuitionActionLoading || !hasStripeAccount || !isStripeOnboardingComplete}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tuitionActionLoading ? 'Gerando…' : 'Gerar checkout'}
              </button>
            </div>
            {(!hasStripeAccount || !isStripeOnboardingComplete) && (
              <p className="mt-3 text-xs text-amber-800">
                Conclua a conexão com o Stripe acima para criar mensalidades.
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-900">Mensalidades cadastradas</h2>
              <p className="mt-0.5 text-sm text-neutral-600">
                Assinaturas vinculadas a alunos. Status atualizado via Stripe.
              </p>
            </div>
            <div className="p-5">
              {subscriptionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
                  <p className="mt-3 text-sm">Carregando…</p>
                </div>
              ) : studentSubscriptions.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-500">
                  Nenhuma mensalidade ainda. Use o formulário acima para criar.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-neutral-500">
                        <th className="pb-3 pr-3 font-medium">Aluno</th>
                        <th className="pb-3 pr-3 font-medium">Valor / mês</th>
                        <th className="pb-3 pr-3 font-medium">Status</th>
                        <th className="pb-3 pr-3 font-medium">Período atual</th>
                        <th className="pb-3 pr-3 font-medium">Criada em</th>
                        <th className="pb-3 text-right font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {studentSubscriptions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-neutral-50/80">
                          <td className="py-3.5 pr-3 align-middle text-neutral-900">
                            {customerLabelById[sub.customerId] ?? sub.customerId}
                          </td>
                          <td className="py-3.5 pr-3 align-middle tabular-nums font-medium">
                            {formatAmount(sub.amount, sub.currency)}
                          </td>
                          <td className="py-3.5 pr-3 align-middle">
                            <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">
                              {subscriptionStatusLabelPt(sub.status)}
                            </span>
                            {sub.cancelAtPeriodEnd ? (
                              <span className="ml-2 text-xs text-amber-700">Cancela no fim do período</span>
                            ) : null}
                          </td>
                          <td className="py-3.5 pr-3 align-middle text-neutral-600">
                            {sub.currentPeriodEnd
                              ? formatPaymentInstant(sub.currentPeriodEnd)
                              : '—'}
                          </td>
                          <td className="py-3.5 pr-3 align-middle text-neutral-600">
                            {formatPaymentInstant(sub.createdAt)}
                          </td>
                          <td className="py-3.5 text-right align-middle">
                            {sub.status === 'active' && sub.stripeSubscriptionId && !sub.cancelAtPeriodEnd ? (
                              <button
                                type="button"
                                onClick={() => handleCancelTuitionAtPeriodEnd(sub)}
                                disabled={tuitionActionLoading}
                                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                              >
                                Cancelar ao fim do período
                              </button>
                            ) : (
                              <span className="text-xs text-neutral-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {(!isEducation || educationTab === 'links') && showPaymentLinkForm && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900">Criar link de pagamento</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Gere um link compartilhável. O cliente paga na página segura da Stripe.
          </p>
          <div className="mt-5">
            <PaymentLinkForm
              businessId={business.id}
              onSubmit={handleCreatePaymentLink}
              onCancel={() => setShowPaymentLinkForm(false)}
            />
          </div>
        </section>
      )}

      {(!isEducation || educationTab === 'links') && (
      <>
      {/* Links de pagamento */}
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Links de pagamento</h2>
          <p className="mt-0.5 text-sm text-neutral-600">
            URLs ativas para cobrança. Use &quot;Copiar&quot; para enviar por WhatsApp ou e-mail. A lista é paginada para não ocupar a página inteira.
          </p>
        </div>
        <div className="p-5">
          {paymentLinksLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
              <p className="mt-3 text-sm">Carregando links…</p>
            </div>
          ) : !paymentLinks || paymentLinks.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              Nenhum link ainda. Crie um com o botão acima.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="pb-3 pr-4 font-medium">Nome</th>
                    <th className="pb-3 pr-4 font-medium">Valor</th>
                    <th className="pb-3 pr-4 font-medium">Expira em</th>
                    <th className="pb-3 pr-4 font-medium">Aluno</th>
                    <th className="pb-3 pr-4 font-medium">Situação</th>
                    <th className="pb-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedPaymentLinks.map((link) => {
                    const expired = isLinkExpired(link);
                    const paid = Boolean(link.paidAt) || hasSucceededPaymentByLinkId.has(link.stripePaymentLinkId);
                    const disabled = !link.active || expired || paid;
                    const expiresAtDate = getExpiresAtDate(link.expiresAt);
                    const cancelled = Boolean(link.cancelledAt) || (!link.active && !paid);
                    return (
                      <tr key={link.id} className="hover:bg-neutral-50/80">
                        <td className="py-3.5 pr-4 align-middle">
                          <span className="font-medium text-neutral-900">{link.name}</span>
                        </td>
                        <td className="py-3.5 pr-4 align-middle tabular-nums text-neutral-800">
                          {formatAmount(link.amount, link.currency)}
                        </td>
                        <td className="py-3.5 pr-4 align-middle text-neutral-600">
                          {expiresAtDate ? expiresAtDate.toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-3.5 pr-4 align-middle text-neutral-700">
                          {link.linkedCustomerId
                            ? customerLabelById[link.linkedCustomerId] ?? link.linkedCustomerId
                            : '—'}
                        </td>
                        <td className="py-3.5 pr-4 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {paid && (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Pago
                              </span>
                            )}
                            {cancelled ? (
                              <span className="inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-800">
                                Cancelado
                              </span>
                            ) : expired ? (
                              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                Expirado
                              </span>
                            ) : paid ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Pago
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                                Aguardando
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-right align-middle">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setLinkingCustomerFor(link);
                                setLinkCustomerDraft(link.linkedCustomerId || '');
                              }}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                            >
                              Aluno
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelPaymentLink(link)}
                              disabled={!link.active || linkActionLoading || paid}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Cancelar link
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(link.stripePaymentLinkUrl, '_blank')}
                              disabled={disabled}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(link.stripePaymentLinkUrl)}
                              disabled={disabled}
                              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Copiar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!paymentLinksLoading && paymentLinks && paymentLinks.length > 0 && (
            <div className="mt-5 flex flex-col gap-4 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-600">
                Mostrando{' '}
                <strong>
                  {linkListTotal === 0
                    ? 0
                    : (linkListPage - 1) * linksPerPage + 1}
                </strong>
                –
                <strong>{Math.min(linkListPage * linksPerPage, linkListTotal)}</strong> de{' '}
                <strong>{linkListTotal}</strong> links
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <span className="whitespace-nowrap">Por página</span>
                  <select
                    value={linksPerPage}
                    onChange={(e) => setLinksPerPage(Number(e.target.value))}
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLinkListPage((p) => Math.max(1, p - 1))}
                    disabled={linkListPage <= 1}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="px-2 text-sm text-neutral-600 tabular-nums">
                    {linkListPage} / {linkListTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLinkListPage((p) => Math.min(linkListTotalPages, p + 1))}
                    disabled={linkListPage >= linkListTotalPages}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      </>
      )}

      {(!isEducation || educationTab === 'history') && (
      <>
      {/* Histórico */}
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Histórico de recebimentos</h2>
          <p className="mt-0.5 text-sm text-neutral-600">
            Pagamentos confirmados e demais status. Filtre por período ou exporte em CSV.
          </p>
        </div>
        <div className="p-5">
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-neutral-100 bg-neutral-50/60 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Buscar</label>
                <input
                  type="search"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="ID, e-mail, Stripe…"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as '' | PaymentStatus)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm min-w-[140px]"
                >
                  <option value="">Todos</option>
                  <option value="succeeded">Pago</option>
                  <option value="pending">Pendente</option>
                  <option value="processing">Processando</option>
                  <option value="failed">Falhou</option>
                  <option value="refunded">Reembolsado</option>
                  <option value="partially_refunded">Parcialmente reembolsado</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Método</label>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value as '' | PaymentMethod)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm min-w-[120px]"
                >
                  <option value="">Todos</option>
                  <option value="card">Cartão</option>
                  <option value="pix">Pix</option>
                  <option value="bank_transfer">Transferência</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">De</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Até</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterSearch('');
                  setFilterStatus('');
                  setFilterMethod('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={exportPaymentsCsv}
                disabled={filteredPayments.length === 0}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
              >
                Exportar CSV
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Período: usa a data de pagamento quando existir; caso contrário, a data de registro. Mostrando{' '}
              <strong>{filteredPayments.length}</strong> de <strong>{payments?.length ?? 0}</strong> pagamentos.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
              <p className="mt-3 text-sm">Carregando histórico…</p>
            </div>
          ) : !payments || payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              Ainda não há pagamentos registrados. Quando alguém pagar um link, aparece aqui.
            </p>
          ) : filteredPayments.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              Nenhum resultado com estes filtros. Limpe ou ajuste a busca.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="pb-3 pr-3 font-medium">Registrado</th>
                    <th className="pb-3 pr-3 font-medium">Pago em</th>
                    <th className="pb-3 pr-3 font-medium">Cliente</th>
                    <th className="pb-3 pr-3 font-medium">Valor</th>
                    <th className="pb-3 pr-3 font-medium">Status</th>
                    <th className="pb-3 pr-3 font-medium">Método</th>
                    <th className="pb-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-neutral-50/80">
                      <td className="py-3.5 pr-3 align-middle text-neutral-800">
                        {formatPaymentInstant(payment.createdAt)}
                      </td>
                      <td className="py-3.5 pr-3 align-middle text-neutral-800">
                        {formatPaymentInstant(payment.succeededAt)}
                      </td>
                      <td className="py-3.5 pr-3 align-middle text-neutral-800">
                        {payment.customerName || payment.customerEmail || '—'}
                      </td>
                      <td className="py-3.5 pr-3 align-middle font-medium tabular-nums text-neutral-900">
                        {formatAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="py-3.5 pr-3 align-middle">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(payment.status)}`}
                        >
                          {paymentStatusLabelPt(payment.status)}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 align-middle capitalize text-neutral-600">
                        {payment.paymentMethod}
                      </td>
                      <td className="py-3.5 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => setDetailPayment(payment)}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      </>
      )}

      {linkingCustomerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-customer-title"
          >
            <h3 id="link-customer-title" className="text-base font-semibold text-neutral-900">
              Vincular aluno
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Associe um cadastro de cliente a este link (controle interno). O pagamento continua sendo feito pelo link da
              Stripe.
            </p>
            <label className="mt-4 block text-xs font-medium text-neutral-600">Cliente</label>
            <select
              value={linkCustomerDraft}
              onChange={(e) => setLinkCustomerDraft(e.target.value)}
              disabled={linkActionLoading}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Nenhum (remover vínculo)</option>
              {(customers ?? [])
                .slice()
                .sort((a, b) =>
                  `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'pt-BR')
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.firstName} ${c.lastName}`.trim()}
                    {c.email ? ` (${c.email})` : ''}
                  </option>
                ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinkingCustomerFor(null)}
                disabled={linkActionLoading}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSaveLinkedCustomer}
                disabled={linkActionLoading}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {linkActionLoading ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
          formatAmount={formatAmount}
          formatInstant={formatPaymentInstant}
          statusLabel={paymentStatusLabelPt}
        />
      )}
    </div>
  );
}


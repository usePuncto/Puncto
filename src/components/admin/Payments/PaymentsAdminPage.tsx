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
import { useTuitionTypes, useTuitionTypeMutations } from '@/lib/queries/tuitionTypes';

/** Mesma cobrança (fatura / PI) pode ter ficado com vários documentos por webhooks — exibe uma linha. */
function dedupePaymentHistoryRows(rows: Payment[]): Payment[] {
  const piToInvoice = new Map<string, string>();
  const chargeToInvoice = new Map<string, string>();
  for (const p of rows) {
    if (p.stripeInvoiceId) {
      if (p.stripePaymentIntentId) piToInvoice.set(p.stripePaymentIntentId, p.stripeInvoiceId);
      if (p.stripeChargeId) chargeToInvoice.set(p.stripeChargeId, p.stripeInvoiceId);
    }
  }

  const canonicalKey = (p: Payment): string => {
    if (p.stripeInvoiceId) return `inv:${p.stripeInvoiceId}`;
    const invFromPi = p.stripePaymentIntentId ? piToInvoice.get(p.stripePaymentIntentId) : undefined;
    if (invFromPi) return `inv:${invFromPi}`;
    const invFromCharge = p.stripeChargeId ? chargeToInvoice.get(p.stripeChargeId) : undefined;
    if (invFromCharge) return `inv:${invFromCharge}`;
    if (p.stripePaymentIntentId) return `pi:${p.stripePaymentIntentId}`;
    if (p.stripeChargeId) return `ch:${p.stripeChargeId}`;
    return `id:${p.id}`;
  };

  const rowScore = (p: Payment) => {
    let n = 0;
    if (p.customerId) n += 3;
    if (p.customerName) n += 2;
    if (p.customerEmail) n += 1;
    if (p.tuitionTypeName) n += 2;
    if (p.description) n += 1;
    if (p.stripeInvoiceId) n += 3;
    if (p.stripeChargeId) n += 1;
    return n;
  };

  const eventMs = (p: Payment): number => {
    if (p.succeededAt) {
      if (p.succeededAt instanceof Date) return p.succeededAt.getTime();
      const s = (p.succeededAt as { seconds?: number })?.seconds;
      if (typeof s === 'number') return s * 1000;
    }
    if (p.createdAt instanceof Date) return p.createdAt.getTime();
    const s = (p.createdAt as { seconds?: number })?.seconds;
    return typeof s === 'number' ? s * 1000 : 0;
  };

  const byKey = new Map<string, Payment>();
  for (const p of rows) {
    const k = canonicalKey(p);
    const prev = byKey.get(k);
    if (!prev || rowScore(p) > rowScore(prev)) byKey.set(k, p);
  }
  return Array.from(byKey.values()).sort((a, b) => eventMs(b) - eventMs(a));
}

function apiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const e = data.error;
  return typeof e === 'string' && e.trim() ? e : fallback;
}

/** Evita `res.json()` quando o servidor devolve HTML (404/502, WAF, proxy, página de login). */
async function readApiJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith('<')) {
    const status = res.status;
    let hint =
      'O servidor devolveu uma página HTML em vez de dados. Isso costuma ser rede corporativa, antivírus, extensão do navegador ou bloqueio na borda (ex.: Cloudflare).';
    if (status === 401 || status === 403) {
      hint = 'Sessão expirada ou sem permissão. Faça login de novo e tente outra vez.';
    } else if (status === 404) {
      hint =
        'A rota da API não foi encontrada neste domínio. Use o painel pelo subdomínio de gestão (ex.: seu-negocio.gestao.puncto.com.br) em vez de www, ou confira se o deploy está atualizado.';
    } else if (status >= 500) {
      hint = 'Erro no servidor ou no gateway; a página devolvida não é JSON. Tente de novo em alguns minutos.';
    }
    throw new Error(`${hint} (HTTP ${status})`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Resposta inválida do servidor (HTTP ${res.status}).`);
  }
}

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
  const [newTuitionTypeName, setNewTuitionTypeName] = useState('');
  const [newTuitionTypeAmountBrl, setNewTuitionTypeAmountBrl] = useState('');
  const [tuitionActionLoading, setTuitionActionLoading] = useState(false);

  const { data: tuitionTypes = [] } = useTuitionTypes(business.id, isEducation);
  const tuitionTypeMutations = useTuitionTypeMutations(business.id);

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

      const data = await readApiJsonResponse(res);
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Falha ao conectar Stripe'));
      }

      if (typeof data.onboardingUrl === 'string' && data.onboardingUrl) {
        window.open(data.onboardingUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      if (data.onboardingComplete === true) {
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

      const data = await readApiJsonResponse(res);
      if (!res.ok) {
        if (res.status === 409 && typeof data.onboardingUrl === 'string' && data.onboardingUrl) {
          window.open(data.onboardingUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        throw new Error(apiErrorMessage(data, 'Falha ao abrir dashboard do Stripe'));
      }

      if (typeof data.url === 'string' && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        alert('A Stripe não retornou uma URL de login.');
      }
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Erro ao abrir dashboard do Stripe');
    } finally {
      setManagingStripe(false);
    }
  };

  const formatAmount = (cents: number, currency?: string | null) => {
    const amountCents = typeof cents === 'number' && !Number.isNaN(cents) ? cents : 0;
    const code = (currency ?? '').trim().toUpperCase() || 'BRL';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: code,
    }).format(amountCents / 100);
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

  const paymentMethodLabelPt = (method: string) => {
    const map: Record<string, string> = {
      card: 'Cartão',
      pix: 'Pix',
      other: 'Outro',
    };
    return map[method] || method;
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

  const handleAddTuitionType = async () => {
    const name = newTuitionTypeName.trim();
    if (!name) {
      alert('Informe o nome do tipo de mensalidade (ex.: Integral, Meio período).');
      return;
    }
    const suggested = newTuitionTypeAmountBrl.trim() ? parseBrlToCents(newTuitionTypeAmountBrl) : null;
    try {
      await tuitionTypeMutations.create.mutateAsync({
        name,
        ...(suggested && suggested > 0 ? { suggestedAmountCents: suggested } : {}),
      });
      setNewTuitionTypeName('');
      setNewTuitionTypeAmountBrl('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao criar tipo de mensalidade');
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

  const dedupedPayments = useMemo(() => dedupePaymentHistoryRows(payments ?? []), [payments]);

  const filteredPayments = useMemo(() => {
    if (!dedupedPayments.length) return [];
    const q = filterSearch.trim().toLowerCase();
    const fromMs = filterDateFrom ? new Date(filterDateFrom + 'T00:00:00').getTime() : null;
    const toMs = filterDateTo ? new Date(filterDateTo + 'T23:59:59.999').getTime() : null;

    return dedupedPayments.filter((p) => {
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
        p.description,
        p.tuitionTypeName,
        p.stripePaymentIntentId,
        p.stripeCheckoutSessionId,
        p.stripeChargeId,
        p.stripeInvoiceId,
        p.stripeSubscriptionId,
        p.bookingId,
        p.stripePaymentLinkStripeId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [dedupedPayments, filterSearch, filterStatus, filterMethod, filterDateFrom, filterDateTo]);

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
      'descricao',
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
      p.description || (p.tuitionTypeName ? `Mensalidade — ${p.tuitionTypeName}` : ''),
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
              ? 'Cadastre tipos de mensalidade, acompanhe assinaturas e o histórico. O vínculo do aluno ao plano e a criação da cobrança ficam no cadastro de alunos (Clientes).'
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
            <h2 className="text-base font-semibold text-neutral-900">Tipos de mensalidade</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Cadastre os planos (ex.: Integral) e informe o <strong className="font-medium text-neutral-800">valor
              sugerido (R$)</strong> — ele define o valor da mensalidade no Stripe. Em{' '}
              <strong className="font-medium text-neutral-800">Clientes</strong>, atribua o tipo ao aluno (com
              e-mail); ao salvar, a mensalidade fica disponível no portal do aluno para pagar e ativar a recorrência.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[180px] flex-1">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Nome do tipo</label>
                <input
                  type="text"
                  value={newTuitionTypeName}
                  onChange={(e) => setNewTuitionTypeName(e.target.value)}
                  placeholder="ex.: Integral"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="w-full min-w-[140px] sm:w-36">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newTuitionTypeAmountBrl}
                  onChange={(e) => setNewTuitionTypeAmountBrl(e.target.value)}
                  placeholder="obrigatório p/ portal"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleAddTuitionType()}
                disabled={tuitionTypeMutations.create.isPending}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
              >
                {tuitionTypeMutations.create.isPending ? 'Salvando…' : 'Adicionar tipo'}
              </button>
            </div>
            {tuitionTypes.length > 0 ? (
              <ul className="mt-4 divide-y divide-neutral-100 rounded-lg border border-neutral-100">
                {tuitionTypes.map((tt) => (
                  <li
                    key={tt.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <span className="font-medium text-neutral-900">{tt.name}</span>
                    <span className="text-neutral-600">
                      {tt.suggestedAmountCents
                        ? formatAmount(tt.suggestedAmountCents, 'brl')
                        : 'Sem valor sugerido'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Remover o tipo "${tt.name}"?`)) return;
                        void tuitionTypeMutations.remove.mutateAsync(tt.id);
                      }}
                      disabled={tuitionTypeMutations.remove.isPending}
                      className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">Nenhum tipo cadastrado ainda — é opcional.</p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-900">Mensalidades cadastradas</h2>
              <p className="mt-0.5 text-sm text-neutral-600">
                Assinaturas recorrentes na Stripe (diferente dos tipos de mensalidade no catálogo acima). Status
                atualizado via Stripe.
              </p>
            </div>
            <div className="p-5">
              {subscriptionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
                  <p className="mt-3 text-sm">Carregando…</p>
                </div>
              ) : studentSubscriptions.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-500 max-w-xl mx-auto">
                  Nenhuma assinatura ainda. Com tipo de mensalidade e <strong className="font-medium text-neutral-700">
                    valor (R$)
                  </strong>{' '}
                  no tipo acima, ao salvar o aluno em <strong className="font-medium text-neutral-700">Clientes</strong>{' '}
                  (e-mail obrigatório) a mensalidade é preparada para o portal. Esta lista atualiza quando o aluno
                  pagar ou quando existir contrato na Stripe.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-neutral-500">
                        <th className="pb-3 pr-3 font-medium">Aluno</th>
                        <th className="pb-3 pr-3 font-medium">Tipo</th>
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
                          <td className="py-3.5 pr-3 align-middle text-neutral-700">
                            {sub.tuitionTypeName || '—'}
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
            {isEducation
              ? ' Inclui mensalidades (faturas Stripe) e links de pagamento.'
              : ''}
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
                  placeholder="ID, e-mail, descrição, tipo…"
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
              <strong>{filteredPayments.length}</strong> de <strong>{dedupedPayments.length}</strong> pagamentos
              {payments && payments.length !== dedupedPayments.length ? (
                <span className="text-neutral-400"> ({payments.length} no banco, deduplicados)</span>
              ) : null}
              .
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
              <p className="mt-3 text-sm">Carregando histórico…</p>
            </div>
          ) : !payments || payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              {isEducation
                ? 'Ainda não há pagamentos registrados. Cobranças de links e mensalidades confirmadas pelo Stripe aparecem aqui.'
                : 'Ainda não há pagamentos registrados. Quando alguém pagar um link, aparece aqui.'}
            </p>
          ) : filteredPayments.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              Nenhum resultado com estes filtros. Limpe ou ajuste a busca.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="pb-3 pr-3 font-medium">Registrado</th>
                    <th className="pb-3 pr-3 font-medium">Pago em</th>
                    <th className="pb-3 pr-3 font-medium">Cliente</th>
                    <th className="pb-3 pr-3 font-medium max-w-[220px]">Descrição</th>
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
                      <td className="py-3.5 pr-3 align-middle text-neutral-600 text-xs max-w-[220px]">
                        {payment.description ||
                          (payment.tuitionTypeName ? `Mensalidade — ${payment.tuitionTypeName}` : '—')}
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
                      <td className="py-3.5 pr-3 align-middle text-neutral-600">
                        {paymentMethodLabelPt(payment.paymentMethod)}
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


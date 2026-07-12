'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Business, PlanId } from '@/types/business';
import { getBusinessTypeLabel } from '@/lib/features/businessTypeFeatures';
import {
  PLAN_OPTIONS,
  SEGMENT_LABELS,
  defaultEnabledModules,
  getModulesForIndustry,
  industryToModuleSegment,
  isModuleEnabled,
  tierToPlanId,
} from '@/content/businessModules';

const INDUSTRY_OPTIONS = [
  'salon',
  'clinic',
  'restaurant',
  'bakery',
  'event',
  'general',
  'empresas',
  'corporativo',
  'education',
] as const;

const STATUS_OPTIONS = ['active', 'trial', 'suspended', 'cancelled', 'pending_payment'] as const;

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Ativo',
    trial: 'Trial',
    suspended: 'Suspenso',
    cancelled: 'Cancelado',
    pending_payment: 'Pagamento pendente',
  };
  return labels[status] || status;
}

export default function PlatformBusinessEditPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const businessId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState({
    industry: 'general',
    planId: 'gratis' as PlanId,
    status: 'active' as (typeof STATUS_OPTIONS)[number],
    stripeCustomerId: '',
    stripeSubscriptionId: '',
    enabledModules: {} as Record<string, boolean>,
  });

  const modules = useMemo(() => getModulesForIndustry(form.industry), [form.industry]);
  const segmentLabel = SEGMENT_LABELS[industryToModuleSegment(form.industry)];
  const enabledCount = modules.filter((m) => isModuleEnabled(form.enabledModules, m.id)).length;

  useEffect(() => {
    if (firebaseUser && businessId) {
      fetchBusiness();
    }
  }, [firebaseUser, businessId]);

  const fetchBusiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await firebaseUser?.getIdToken();
      const response = await fetch(`/api/platform/businesses/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Negócio não encontrado');
      }

      const data = await response.json();
      const b = data.business as Business;
      const industry = b.industry || 'general';
      const defaults = defaultEnabledModules(industry);
      const stored = b.enabledModules || {};

      setBusiness(b);
      setForm({
        industry,
        planId: tierToPlanId(b.subscription?.tier, b.subscription?.planId),
        status: (b.subscription?.status || 'active') as (typeof STATUS_OPTIONS)[number],
        stripeCustomerId: b.subscription?.stripeCustomerId || '',
        stripeSubscriptionId: b.subscription?.stripeSubscriptionId || '',
        enabledModules: { ...defaults, ...stored },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar negócio');
    } finally {
      setLoading(false);
    }
  };

  const handleIndustryChange = (industry: string) => {
    const defaults = defaultEnabledModules(industry);
    // Preserve toggles for modules that exist in both catalogs
    const preserved: Record<string, boolean> = {};
    for (const mod of getModulesForIndustry(industry)) {
      preserved[mod.id] =
        mod.id in form.enabledModules ? form.enabledModules[mod.id] : defaults[mod.id];
    }
    setForm({ ...form, industry, enabledModules: preserved });
  };

  const toggleModule = (moduleId: string) => {
    setForm((prev) => ({
      ...prev,
      enabledModules: {
        ...prev.enabledModules,
        [moduleId]: !isModuleEnabled(prev.enabledModules, moduleId),
      },
    }));
  };

  const setAllModules = (enabled: boolean) => {
    const next: Record<string, boolean> = {};
    for (const mod of modules) {
      next[mod.id] = enabled;
    }
    setForm({ ...form, enabledModules: next });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    setSaving(true);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/platform/businesses/${businessId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry: form.industry,
          enabledModules: form.enabledModules,
          subscription: {
            planId: form.planId,
            status: form.status,
            stripeCustomerId: form.stripeCustomerId.trim() || undefined,
            stripeSubscriptionId: form.stripeSubscriptionId.trim() || undefined,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erro ao salvar');
      }

      router.push(`/platform/businesses/${businessId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-600">{error || 'Negócio não encontrado'}</p>
        <Link href="/platform/businesses" className="text-blue-600 hover:underline mt-4 inline-block">
          Voltar aos Negócios
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/platform/businesses/${businessId}`}
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Voltar ao negócio
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Editar negócio</h1>
        <p className="mt-1 text-gray-600">{business.displayName}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Informações do negócio</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Nome de exibição</p>
              <p className="font-medium text-gray-900">{business.displayName}</p>
            </div>
            <div>
              <p className="text-gray-500">Slug</p>
              <p className="font-medium text-gray-900">{business.slug}</p>
            </div>
            <div>
              <p className="text-gray-500">E-mail</p>
              <p className="font-medium text-gray-900">{business.email}</p>
            </div>
            <div>
              <p className="text-gray-500">Telefone</p>
              <p className="font-medium text-gray-900">{business.phone || '—'}</p>
            </div>
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
              Segmento
            </label>
            <select
              id="industry"
              value={form.industry}
              onChange={(e) => handleIndustryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {INDUSTRY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {getBusinessTypeLabel(value)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Catálogo de módulos: {segmentLabel}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Assinatura</h2>
          <p className="text-sm text-gray-500">
            Planos comerciais iguais aos de{' '}
            <Link href="/pricing" className="text-blue-600 hover:underline" target="_blank">
              /pricing
            </Link>
            : Grátis, Starter, Growth e Pro.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="planId" className="block text-sm font-medium text-gray-700 mb-1">
                Plano
              </label>
              <select
                id="planId"
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value as PlanId })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {PLAN_OPTIONS.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as (typeof STATUS_OPTIONS)[number] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="stripeCustomerId" className="block text-sm font-medium text-gray-700 mb-1">
              Stripe Customer ID
            </label>
            <input
              id="stripeCustomerId"
              type="text"
              value={form.stripeCustomerId}
              onChange={(e) => setForm({ ...form, stripeCustomerId: e.target.value })}
              placeholder="cus_..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>

          <div>
            <label htmlFor="stripeSubscriptionId" className="block text-sm font-medium text-gray-700 mb-1">
              Stripe Subscription ID
            </label>
            <input
              id="stripeSubscriptionId"
              type="text"
              value={form.stripeSubscriptionId}
              onChange={(e) => setForm({ ...form, stripeSubscriptionId: e.target.value })}
              placeholder="sub_..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Módulos</h2>
              <p className="text-sm text-gray-500">
                Ative ou desative o acesso deste negócio a cada módulo ({segmentLabel}).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {enabledCount}/{modules.length} ativos
              </span>
              <button
                type="button"
                onClick={() => setAllModules(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Ativar todos
              </button>
              <button
                type="button"
                onClick={() => setAllModules(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                Desativar todos
              </button>
            </div>
          </div>

          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {modules.map((mod) => {
              const on = isModuleEnabled(form.enabledModules, mod.id);
              return (
                <li
                  key={mod.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{mod.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{mod.id}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${on ? 'Desativar' : 'Ativar'} ${mod.name}`}
                    onClick={() => toggleModule(mod.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      on ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        on ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <Link
            href={`/platform/businesses/${businessId}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

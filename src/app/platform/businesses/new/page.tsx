'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { PlanId } from '@/types/business';
import { getBusinessTypeLabel } from '@/lib/features/businessTypeFeatures';
import {
  PLAN_OPTIONS,
  SEGMENT_LABELS,
  defaultEnabledModules,
  getModulesForIndustry,
  industryToModuleSegment,
  isModuleEnabled,
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function PlatformBusinessNewPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    legalName: '',
    email: '',
    phone: '',
    taxId: '',
    slug: '',
    industry: 'general',
    planId: 'gratis' as PlanId,
    status: 'active' as (typeof STATUS_OPTIONS)[number],
    enabledModules: defaultEnabledModules('general') as Record<string, boolean>,
  });

  const modules = useMemo(() => getModulesForIndustry(form.industry), [form.industry]);
  const segmentLabel = SEGMENT_LABELS[industryToModuleSegment(form.industry)];
  const enabledCount = modules.filter((m) => isModuleEnabled(form.enabledModules, m.id)).length;

  const handleDisplayNameChange = (displayName: string) => {
    setForm((prev) => ({
      ...prev,
      displayName,
      slug: slugManual ? prev.slug : slugify(displayName),
      legalName: prev.legalName || displayName,
    }));
  };

  const handleIndustryChange = (industry: string) => {
    const defaults = defaultEnabledModules(industry);
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

    if (!form.displayName.trim() || !form.email.trim() || !form.slug.trim()) {
      setError('Preencha nome de exibição, e-mail e identificador (slug).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/platform/businesses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          legalName: (form.legalName || form.displayName).trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          taxId: form.taxId.trim(),
          slug: form.slug.trim(),
          industry: form.industry,
          planId: form.planId,
          status: form.status,
          enabledModules: form.enabledModules,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erro ao criar negócio');
      }

      router.push(`/platform/businesses/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar negócio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/platform/businesses"
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Voltar aos Negócios
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Criar negócio</h1>
        <p className="mt-1 text-gray-600">
          Cadastre um novo negócio na plataforma com plano e módulos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Dados do negócio</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Nome de exibição *
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={form.displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="Ex.: Salão da Maria"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="legalName" className="block text-sm font-medium text-gray-700 mb-1">
                Razão social
              </label>
              <input
                id="legalName"
                type="text"
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                placeholder="Ex.: Maria Serviços de Beleza LTDA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail *
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@negocio.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ / CPF
              </label>
              <input
                id="taxId"
                type="text"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                Segmento *
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
              <p className="mt-1 text-xs text-gray-500">Catálogo de módulos: {segmentLabel}</p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                Identificador (slug) *
              </label>
              <div className="flex gap-2">
                <input
                  id="slug"
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setForm({ ...form, slug: slugify(e.target.value) });
                  }}
                  placeholder="salao-da-maria"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                URL pública: <span className="font-mono">{form.slug || '...'}.puncto.com.br</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Assinatura</h2>

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
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Módulos</h2>
              <p className="text-sm text-gray-500">
                Defina quais módulos este negócio terá acesso ({segmentLabel}).
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
            {saving ? 'Criando...' : 'Criar negócio'}
          </button>
          <Link
            href="/platform/businesses"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

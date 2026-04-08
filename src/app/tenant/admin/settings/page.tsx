'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingPlans } from '@/components/marketing/PricingCard';
import {
  ALL_FEATURE_IDS,
  FEATURE_LABELS,
  getIncludedFeaturesForPlanAndIndustry,
  getBusinessTypeLabel,
} from '@/lib/features/businessTypeFeatures';
import type { FeatureId } from '@/lib/features/businessTypeFeatures';
import { useTranslations } from 'next-intl';

const INDUSTRY_DISPLAY: Record<string, string> = {
  services: 'Serviços',
  servicos: 'Serviços',
  retail: 'Comércio',
  varejo: 'Comércio',
  restaurant: 'Restaurante',
  salon: 'Salão de Beleza',
  clinic: 'Clínica',
  bakery: 'Padaria',
  event: 'Eventos',
  general: 'Serviços Gerais',
  education: 'Educação',
};

function industryDisplayName(industry: string): string {
  return INDUSTRY_DISPLAY[industry] || getBusinessTypeLabel(industry) || industry;
}

function formatTaxId(taxId: string): string {
  const digits = taxId.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return taxId;
}

function formatAddress(addr: { street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string }): string {
  const parts = [
    [addr.street, addr.number].filter(Boolean).join(', '),
    addr.complement,
    addr.neighborhood,
    [addr.city, addr.state].filter(Boolean).join(' - '),
    addr.zipCode,
  ].filter(Boolean);
  return parts.join(', ') || '—';
}

const TIER_TO_PLAN: Record<string, string> = {
  free: 'gratis',
  gratis: 'gratis',
  basic: 'starter',
  starter: 'starter',
  growth: 'growth',
  pro: 'pro',
  enterprise: 'enterprise',
};

// Placeholder pay-as-you-go stats (replace with API when available)
const DEFAULT_USAGE = {
  whatsappMessages: { used: 0, limit: 150, period: 'Este mês' },
  nfseNfce: { used: 0, limit: 30, period: 'Este mês' },
};

export default function AdminSettingsPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'subscription' | 'branding'>('general');

  const brandingMutation = useMutation({
    mutationFn: async (branding: any) => {
      const response = await fetch(`/api/branding?businessId=${business?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding }),
      });
      if (!response.ok) throw new Error('Failed to update branding');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', business?.id] });
    },
  });

  const hasWhiteLabel = business?.features?.whiteLabel || false;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">Configurações</h1>
        <p className="text-neutral-600 mt-2">Gerencie as configurações do seu negócio</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-medium ${activeTab === 'general' ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
        >
          Geral
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2 font-medium ${activeTab === 'subscription' ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
        >
          Assinatura e Recursos
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 font-medium ${activeTab === 'branding' ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
        >
          Branding {hasWhiteLabel && <span className="text-xs text-green-600">(White-label)</span>}
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'general' && (
          <GeneralSettings business={business} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['business', business?.id] }); router.refresh(); }} />
        )}

        {activeTab === 'subscription' && (
          <SubscriptionTab business={business} />
        )}

        {activeTab === 'branding' && (
          <BrandingSettings
            business={business}
            branding={business?.branding || { gallery: [] }}
            hasWhiteLabel={hasWhiteLabel}
            onSave={(branding: any) => brandingMutation.mutate(branding)}
            isLoading={brandingMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

const WEEKDAYS: { key: keyof import('@/types/business').WorkingHours; label: string }[] = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_WORKING_HOURS: import('@/types/business').WorkingHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '14:00', closed: false },
  sunday: { open: '09:00', close: '14:00', closed: true },
};

function GeneralSettings({ business, onSuccess }: { business: any; onSuccess: () => void }) {
  const addr = business?.address || {};
  const wh = business?.settings?.workingHours || DEFAULT_WORKING_HOURS;

  const cp = business?.settings?.cancellationPolicy || {};

  const [formData, setFormData] = useState({
    displayName: business?.displayName || '',
    phone: business?.phone || '',
    street: addr.street || '',
    number: addr.number || '',
    complement: addr.complement || '',
    neighborhood: addr.neighborhood || '',
    city: addr.city || '',
    state: addr.state || '',
    zipCode: addr.zipCode || '',
    workingHours: { ...DEFAULT_WORKING_HOURS, ...wh } as typeof DEFAULT_WORKING_HOURS,
    cancellationPolicyText: cp.text || '',
  });

  useEffect(() => {
    const a = business?.address || {};
    const w = business?.settings?.workingHours || {};
    const c = business?.settings?.cancellationPolicy || {};
    setFormData({
      displayName: business?.displayName || '',
      phone: business?.phone || '',
      street: a.street || '',
      number: a.number || '',
      complement: a.complement || '',
      neighborhood: a.neighborhood || '',
      city: a.city || '',
      state: a.state || '',
      zipCode: a.zipCode || '',
      workingHours: { ...DEFAULT_WORKING_HOURS, ...w } as typeof DEFAULT_WORKING_HOURS,
      cancellationPolicyText: c.text || '',
    });
  }, [business?.id, business?.displayName, business?.phone, business?.address, business?.settings?.workingHours, business?.settings?.cancellationPolicy]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/business?businessId=${business?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: data.displayName,
          phone: data.phone,
          address: {
            street: data.street,
            number: data.number,
            complement: data.complement,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: addr.country || 'BR',
          },
          workingHours: data.workingHours,
          cancellationPolicy: { ...cp, text: data.cancellationPolicyText },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao salvar');
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const updateWorkingHours = (day: keyof typeof formData.workingHours, field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: { ...prev.workingHours[day], [field]: value },
      },
    }));
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold mb-4">Informações da Empresa</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nome comercial *</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Razão social</label>
            <input
              type="text"
              value={business?.legalName || ''}
              readOnly
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">CPF/CNPJ</label>
            <input
              type="text"
              value={business?.taxId ? formatTaxId(business.taxId) : ''}
              readOnly
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input type="email" value={business?.email || ''} readOnly className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Segmento</label>
            <input
              type="text"
              value={business?.industry ? industryDisplayName(business.industry) : ''}
              readOnly
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50"
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Rua</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Rua, avenida..."
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Número</label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="123"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Complemento</label>
              <input
                type="text"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Sala, andar..."
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Bairro</label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Bairro"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Cidade"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Estado</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="UF"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">CEP</label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="00000-000"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Horário de funcionamento</h3>
          <p className="text-xs text-neutral-500 mb-3">Defina o horário em que seu negócio atende clientes (usado para disponibilidade de agendamentos)</p>
          <div className="space-y-3">
            {WEEKDAYS.map(({ key, label }) => (
              <div key={key} className="flex flex-wrap items-center gap-4">
                <span className="w-20 text-sm text-neutral-700">{label}</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.workingHours[key]?.closed ?? false}
                    onChange={(e) => updateWorkingHours(key, 'closed', e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <span className="text-sm text-neutral-600">Fechado</span>
                </label>
                {!formData.workingHours[key]?.closed && (
                  <>
                    <input
                      type="time"
                      value={formData.workingHours[key]?.open || '09:00'}
                      onChange={(e) => updateWorkingHours(key, 'open', e.target.value)}
                      className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                    />
                    <span className="text-neutral-400">até</span>
                    <input
                      type="time"
                      value={formData.workingHours[key]?.close || '18:00'}
                      onChange={(e) => updateWorkingHours(key, 'close', e.target.value)}
                      className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Política de cancelamento</h3>
          <p className="text-xs text-neutral-500 mb-2">
            Este texto será exibido quando o cliente clicar no link &quot;política de cancelamento&quot; na etapa de confirmação do agendamento.
          </p>
          <textarea
            value={formData.cancellationPolicyText}
            onChange={(e) => setFormData({ ...formData, cancellationPolicyText: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 min-h-[120px]"
            placeholder="Ex.: O cancelamento pode ser feito até 24 horas antes do horário agendado sem custos. Cancelamentos com menos de 24 horas de antecedência podem estar sujeitos a taxa."
            rows={4}
          />
        </div>

        {saveMutation.isError && (
          <p className="text-sm text-red-600">{saveMutation.error instanceof Error ? saveMutation.error.message : 'Erro ao salvar'}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SubscriptionTab({ business }: { business: any }) {
  const [loading, setLoading] = useState(false);
  const sub = business?.subscription;
  const tier = sub?.tier || 'free';
  const planId = TIER_TO_PLAN[tier] || 'gratis';
  const industry = business?.industry || 'general';
  const planInfo = pricingPlans.find((p) => p.id === planId);
  const includedFeatures = new Set(getIncludedFeaturesForPlanAndIndustry(planId, industry));
  const [enabledAddOns, setEnabledAddOns] = useState<Set<string>>(new Set());
  const usage = DEFAULT_USAGE;

  const handleManageSubscription = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, returnUrl: window.location.href }),
      });
      if (!res.ok) throw new Error('Erro');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      alert('Erro ao abrir portal de assinatura');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: Date | any) => {
    if (!d) return '—';
    const date = d?.toDate ? d.toDate() : d;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const toggleAddOn = (id: string) => {
    setEnabledAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Assinatura e Preços</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Plano atual</span>
              <span className="font-semibold capitalize">{planInfo?.name || tier}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Status</span>
              <span className={`capitalize font-medium ${sub?.status === 'active' ? 'text-green-600' : sub?.status === 'trial' ? 'text-blue-600' : sub?.status === 'suspended' ? 'text-yellow-600' : 'text-neutral-700'}`}>
                {sub?.status || 'active'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Período atual</span>
              <span className="text-sm">{formatDate(sub?.currentPeriodStart)} — {formatDate(sub?.currentPeriodEnd)}</span>
            </div>
            {sub?.billingEmail && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Email de cobrança</span>
                <span className="text-sm">{sub.billingEmail}</span>
              </div>
            )}
            {sub?.paymentMethod?.last4 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Cartão</span>
                <span className="text-sm">•••• {sub.paymentMethod.last4}</span>
              </div>
            )}
          </div>
          <div>
            {planInfo && (
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm font-medium text-neutral-800 mb-2">{planInfo.name}</p>
                <p className="text-sm text-neutral-600 mb-2">{planInfo.description}</p>
                <p className="text-lg font-bold">
                  {planInfo.customPrice || `R$ ${planInfo.price.monthly.toFixed(2).replace('.', ',')}`}/mês
                </p>
              </div>
            )}
            {sub?.cancelAtPeriodEnd && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Sua assinatura será cancelada ao final do período atual.
              </div>
            )}
            <div className="mt-4">
              <button
                onClick={handleManageSubscription}
                disabled={loading || !sub?.stripeCustomerId}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Abrindo...' : 'Gerenciar assinatura'}
              </button>
              {!sub?.stripeCustomerId && (
                <p className="mt-2 text-xs text-neutral-500">Configure uma assinatura para alterar plano ou forma de pagamento.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-2">Recursos e Add-ons</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Todos os recursos disponíveis na plataforma. Veja o que está incluído no seu plano e o que pode ser adicionado.
        </p>
        <div className="space-y-2">
          {ALL_FEATURE_IDS.map((id) => {
            const label = FEATURE_LABELS[id as FeatureId];
            const isIncluded = includedFeatures.has(id);
            const isAddOnActive = enabledAddOns.has(id);
            return (
              <div key={id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-neutral-200 hover:bg-neutral-50">
                <span className="text-sm font-medium">{label}</span>
                <div className="flex items-center gap-2">
                  {isIncluded ? (
                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Incluído no plano</span>
                  ) : isAddOnActive ? (
                    <>
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Add-on ativo</span>
                      <button type="button" onClick={() => toggleAddOn(id)} className="text-sm text-blue-600 hover:text-blue-800">
                        Desativar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs px-2 py-1 rounded bg-neutral-100 text-neutral-600">Add-on disponível</span>
                      <button type="button" onClick={() => toggleAddOn(id)} className="text-sm text-blue-600 hover:text-blue-800">
                        Ativar add-on
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 mt-4">
          Add-ons são cobrados separadamente conforme uso. Entre em contato para habilitar funcionalidades fora do seu plano.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-2">Uso do período (Pay-as-you-go)</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Acompanhe seu consumo de recursos cobrados por uso no período atual.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-neutral-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Mensagens WhatsApp</span>
              <span className="text-sm text-neutral-600">{usage.whatsappMessages.period}</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${usage.whatsappMessages.limit ? Math.min(100, (usage.whatsappMessages.used / usage.whatsappMessages.limit) * 100) : 0}%` }} />
            </div>
            <p className="text-xs text-neutral-500 mt-2">{usage.whatsappMessages.used} / {usage.whatsappMessages.limit} utilizados</p>
          </div>
          <div className="p-4 border border-neutral-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">NFS-e / NFC-e</span>
              <span className="text-sm text-neutral-600">{usage.nfseNfce.period}</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${usage.nfseNfce.limit ? Math.min(100, (usage.nfseNfce.used / usage.nfseNfce.limit) * 100) : 0}%` }} />
            </div>
            <p className="text-xs text-neutral-500 mt-2">{usage.nfseNfce.used} / {usage.nfseNfce.limit} emitidas</p>
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-4">Os limites variam conforme seu plano. Consulte sua fatura para valores de excedente.</p>
      </div>
    </div>
  );
}

function BrandingSettings({ business, branding, hasWhiteLabel, onSave, isLoading }: any) {
  const t = useTranslations('settings.branding');
  const [uploadingField, setUploadingField] = useState<'logoUrl' | 'coverUrl' | 'faviconUrl' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    logoUrl: branding?.logoUrl || '',
    coverUrl: branding?.coverUrl || '',
    primaryColor: branding?.primaryColor || '',
    secondaryColor: branding?.secondaryColor || '',
    faviconUrl: branding?.faviconUrl || '',
    customCSS: branding?.customCSS || '',
    hidePunctoBranding: branding?.hidePunctoBranding || false,
    linkInBioUrl:
      branding?.linkInBioUrl ||
      `${business?.slug || 'seu-negocio'}.puncto.com.br`,
  });

  const fieldToUploadKey: Record<string, 'logo' | 'cover' | 'favicon'> = {
    logoUrl: 'logo',
    coverUrl: 'cover',
    faviconUrl: 'favicon',
  };

  const handleFileChange =
    (field: 'logoUrl' | 'coverUrl' | 'faviconUrl') =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !business?.id) return;
      setUploadError(null);
      setUploadingField(field);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(
          `/api/branding/upload?businessId=${business.id}&field=${fieldToUploadKey[field]}`,
          { method: 'POST', body: form }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Upload failed');
        }
        const { url } = await res.json();
        setFormData((prev) => ({ ...prev, [field]: url }));
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Failed to upload');
      } finally {
        setUploadingField(null);
      }
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold mb-4">{t('title')}</h2>
      {uploadError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t('logoLabel')}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange('logoUrl')}
              disabled={!!uploadingField}
              className="block w-full text-xs text-neutral-700 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {uploadingField === 'logoUrl' ? t('uploading') : t('logoHint')}
            </p>
            {formData.logoUrl && (
              <img
                src={formData.logoUrl}
                alt="Logo preview"
                className="mt-2 h-16 w-auto object-contain"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t('coverLabel')}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange('coverUrl')}
              disabled={!!uploadingField}
              className="block w-full text-xs text-neutral-700 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {uploadingField === 'coverUrl' ? t('uploading') : t('coverHint')}
            </p>
            {formData.coverUrl && (
              <img
                src={formData.coverUrl}
                alt="Cover preview"
                className="mt-2 h-24 w-full object-cover rounded"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t('primaryColorLabel')}
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.primaryColor || '#000000'}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="h-10 w-20 rounded border border-neutral-300"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                placeholder="#000000"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t('secondaryColorLabel')}
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.secondaryColor || '#666666'}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="h-10 w-20 rounded border border-neutral-300"
              />
              <input
                type="text"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                placeholder="#666666"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t('faviconLabel')}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange('faviconUrl')}
              disabled={!!uploadingField}
              className="block w-full text-xs text-neutral-700 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {uploadingField === 'faviconUrl' ? t('uploading') : t('faviconHint')}
            </p>
            {formData.faviconUrl && (
              <img
                src={formData.faviconUrl}
                alt="Favicon preview"
                className="mt-2 h-8 w-8 object-contain rounded"
              />
            )}
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4 mt-2 space-y-2">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            {t('linkInBioLabel')}
          </label>
          <input
            type="text"
            value={formData.linkInBioUrl}
            readOnly
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50"
          />
          <p className="text-xs text-neutral-500">
            {t('linkInBioDescription')}
          </p>
          <p className="text-xs text-neutral-500">
            {t('linkInBioSupportNote')}
          </p>
        </div>

        {hasWhiteLabel && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('customCssLabel')}
              </label>
              <textarea
                value={formData.customCSS}
                onChange={(e) => setFormData({ ...formData, customCSS: e.target.value })}
                placeholder={t('customCssPlaceholder')}
                rows={6}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-neutral-500 mt-1">{t('customCssHint')}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hidePunctoBranding"
                checked={formData.hidePunctoBranding}
                onChange={(e) => setFormData({ ...formData, hidePunctoBranding: e.target.checked })}
                className="rounded border-neutral-300"
              />
              <label htmlFor="hidePunctoBranding" className="text-sm font-medium text-neutral-700">
                {t('hideBrandingLabel')}
              </label>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
          >
            {isLoading ? t('submitSaving') : t('submitLabel')}
          </button>
        </div>
      </form>
    </div>
  );
}

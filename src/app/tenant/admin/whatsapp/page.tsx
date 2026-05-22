'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { WhatsAppConfig, WhatsAppMessageTemplate, ConfirmationChannel } from '@/types/business';
import { useCustomers } from '@/lib/queries/customers';
import { Customer } from '@/types/booking';
import { buildWhatsAppUrl } from '@/lib/utils/whatsappUrl';
import { WhatsAppConversationsTab } from '@/components/whatsapp/WhatsAppConversationsTab';

type WhatsAppStatusResponse = {
  connected: boolean;
  phoneNumber: string | null;
  provider?: string | null;
  state?: string;
  qrCodeBase64?: string;
  evolutionConfigured?: boolean;
};

const TIER_TO_PLAN: Record<string, string> = {
  free: 'gratis',
  gratis: 'gratis',
  basic: 'starter',
  starter: 'starter',
  growth: 'growth',
  pro: 'pro',
  enterprise: 'enterprise',
};

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export default function AdminWhatsAppPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations('whatsapp');

  const tier = business?.subscription?.tier || 'free';
  const planId = TIER_TO_PLAN[tier] || 'gratis';
  const isAutomated = planId === 'growth' || planId === 'pro' || planId === 'enterprise';

  const settings = business?.settings;
  const whatsapp: Partial<WhatsAppConfig> = settings?.whatsapp ?? {};

  const confirmationChannels: ConfirmationChannel[] =
    settings?.confirmationChannels ?? ['email'];
  const sendConfirmationsViaWhatsApp = confirmationChannels.includes('whatsapp');

  const [formData, setFormData] = useState<Partial<WhatsAppConfig>>({
    number: whatsapp.number || business?.phone || '',
    presetMessage: whatsapp.presetMessage || '',
    messageTemplates: whatsapp.messageTemplates ?? [],
  });

  const [editingTemplate, setEditingTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'send' | 'conversations' | 'config'>('send');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const { data: customers = [] } = useCustomers(business?.id ?? '');

  useEffect(() => {
    const w = business?.settings?.whatsapp;
    if (w || business?.phone) {
      setFormData((prev) => ({
        ...prev,
        number: w?.number || business?.phone || prev.number || '',
        presetMessage: w?.presetMessage ?? prev.presetMessage ?? '',
        messageTemplates: w?.messageTemplates ?? prev.messageTemplates ?? [],
      }));
    }
  }, [business?.id, business?.phone, business?.settings?.whatsapp]);

  const templates: WhatsAppMessageTemplate[] = formData.messageTemplates ?? [];
  const hasTemplates = templates.length > 0;

  const saveMutation = useMutation({
    mutationFn: async (data: {
      number: string;
      presetMessage?: string;
      messageTemplates?: WhatsAppMessageTemplate[];
      confirmationChannels?: ConfirmationChannel[];
    }) => {
      const res = await fetch(`/api/settings?businessId=${business?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...settings,
            whatsapp: {
              ...whatsapp,
              number: data.number,
              presetMessage: data.presetMessage,
              messageTemplates: data.messageTemplates,
            },
            ...(data.confirmationChannels !== undefined && {
              confirmationChannels: data.confirmationChannels,
            }),
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', business?.id] });
      router.refresh(); // Reload server data (layout fetches business)
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      number: formData.number || '',
      presetMessage: formData.presetMessage || undefined,
      messageTemplates: templates,
    });
  };

  const handleAddTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateBody.trim()) return;
    const newT: WhatsAppMessageTemplate = {
      id: generateId(),
      name: newTemplateName.trim(),
      body: newTemplateBody.trim(),
    };
    setFormData((prev) => ({
      ...prev,
      messageTemplates: [...(prev.messageTemplates ?? []), newT],
    }));
    setNewTemplateName('');
    setNewTemplateBody('');
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;
    setFormData((prev) => ({
      ...prev,
      messageTemplates: (prev.messageTemplates ?? []).map((t) =>
        t.id === editingTemplate.id
          ? { ...t, name: newTemplateName.trim(), body: newTemplateBody.trim() }
          : t
      ),
    }));
    setEditingTemplate(null);
    setNewTemplateName('');
    setNewTemplateBody('');
  };

  const handleDeleteTemplate = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      messageTemplates: (prev.messageTemplates ?? []).filter((t) => t.id !== id),
    }));
    if (selectedTemplateId === id) setSelectedTemplateId('');
  };

  const startEditTemplate = (t: WhatsAppMessageTemplate) => {
    setEditingTemplate(t);
    setNewTemplateName(t.name);
    setNewTemplateBody(t.body);
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllContacts = (checked: boolean) => {
    if (checked) {
      setSelectedContactIds(new Set(filteredCustomers.map((c) => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const openWhatsApp = (customer: Customer, message: string) => {
    if (!customer.phone?.trim()) return;
    const url = buildWhatsAppUrl(customer.phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleToggleWhatsAppConfirmations = (checked: boolean) => {
    const baseChannels: ConfirmationChannel[] = confirmationChannels ?? ['email'];
    const channels: ConfirmationChannel[] = checked
      ? (Array.from(new Set([...baseChannels, 'whatsapp'])) as ConfirmationChannel[])
      : baseChannels.filter((c) => c !== 'whatsapp');
    saveMutation.mutate({
      number: formData.number || '',
      presetMessage: formData.presetMessage,
      messageTemplates: templates,
      confirmationChannels: channels,
    });
  };

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['whatsapp-status', business?.id],
    queryFn: async () => {
      const res = await fetch(`/api/whatsapp/status?businessId=${business?.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<WhatsAppStatusResponse>;
    },
    enabled: !!business?.id && isAutomated,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d || d.connected) return false;
      return 4000;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/whatsapp/evolution/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business?.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to connect');
      }
      return res.json() as Promise<{
        phoneNumber?: string;
        qrCodeBase64?: string;
        pairingCode?: string;
        error?: string;
      }>;
    },
    onSuccess: (data) => {
      if (data.qrCodeBase64) setQrImage(data.qrCodeBase64);
      if (data.pairingCode) setPairingCode(data.pairingCode);
      void refetchStatus();
      if (data.phoneNumber) {
        setFormData((prev) => ({ ...prev, number: data.phoneNumber || prev.number }));
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/whatsapp/evolution/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business?.id }),
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      return res.json();
    },
    onSuccess: () => {
      setQrImage(null);
      setPairingCode(null);
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['business', business?.id] });
    },
  });

  const whatsappConnected = status?.connected ?? false;
  const qrBase64 = qrImage || status?.qrCodeBase64 || connectMutation.data?.qrCodeBase64;
  const displayPairingCode = pairingCode || connectMutation.data?.pairingCode;
  const evolutionConfigured = status?.evolutionConfigured !== false;

  useEffect(() => {
    if (status?.qrCodeBase64 && !qrImage) {
      setQrImage(status.qrCodeBase64);
    }
    if (whatsappConnected) {
      setQrImage(null);
      setPairingCode(null);
    }
  }, [status?.qrCodeBase64, whatsappConnected, qrImage]);

  const filteredCustomers = customers.filter((c) => {
    const q = contactSearch.toLowerCase().trim();
    if (!q) return true;
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    const phone = (c.phone || '').replace(/\D/g, '');
    const searchDigits = q.replace(/\D/g, '');
    return name.includes(q) || phone.includes(searchDigits) || (c.email || '').toLowerCase().includes(q);
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const messageToSend = selectedTemplate?.body ?? formData.presetMessage ?? '';
  const selectedContacts = filteredCustomers.filter((c) => selectedContactIds.has(c.id));
  const customersWithPhone = selectedContacts.filter((c) => c.phone?.trim());

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-600 mt-2">
          {isAutomated ? t('subtitleEvolution') : t('manualSubtitle')}
        </p>
      </div>

      {isAutomated && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-2">{t('connectTitle')}</h2>
          {!evolutionConfigured ? (
            <p className="text-sm text-amber-700">{t('evolutionNotConfigured')}</p>
          ) : whatsappConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <span>✓</span>
                <span>
                  {t('connected')} {status?.phoneNumber && `(${status.phoneNumber})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                {disconnectMutation.isPending ? t('disconnecting') : t('disconnect')}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-neutral-600 mb-3">{t('connectDescEvolution')}</p>
              <ol className="list-decimal list-inside text-sm text-neutral-600 mb-4 space-y-1">
                <li>{t('evolutionStep1')}</li>
                <li>{t('evolutionStep2')}</li>
                <li>{t('evolutionStep3')}</li>
              </ol>
              <button
                type="button"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {connectMutation.isPending ? t('connecting') : t('showQrCode')}
              </button>
              {connectMutation.isError && (
                <p className="mt-2 text-sm text-red-600">{connectMutation.error?.message}</p>
              )}
              {displayPairingCode && !qrBase64 && (
                <p className="mt-3 text-sm text-neutral-700">
                  {t('pairingCode')}:{' '}
                  <span className="font-mono font-semibold">{displayPairingCode}</span>
                </p>
              )}
              {qrBase64 ? (
                <div className="mt-4 flex flex-col items-start gap-2">
                  <p className="text-sm font-medium text-neutral-700">{t('scanQr')}</p>
                  <img
                    src={
                      qrBase64.startsWith('data:')
                        ? qrBase64
                        : `data:image/png;base64,${qrBase64}`
                    }
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 rounded-lg border border-neutral-200 bg-white"
                  />
                  <p className="text-xs text-neutral-500">{t('waitingConnection')}</p>
                </div>
              ) : (
                connectMutation.isSuccess &&
                !connectMutation.isPending && (
                  <p className="mt-3 text-sm text-amber-700">{t('qrNotReturned')}</p>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'send'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {t('tabSend')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('conversations')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'conversations'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {t('tabConversations')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'config'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {t('tabConfig')}
          </button>
        </div>
      </div>

      {activeTab === 'send' && (
        <>
          {/* Manual send: select contacts + open WhatsApp */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">{t('sendManualTitle')}</h2>
            <p className="text-sm text-neutral-600 mb-4">{t('sendManualDesc')}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">{t('selectTemplate')}</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">{t('selectTemplatePlaceholder')}</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
                {!hasTemplates && formData.presetMessage && (
                  <option value="__preset__">{t('defaultMessage')}</option>
                )}
              </select>
              {!hasTemplates && !formData.presetMessage && (
                <p className="mt-1 text-xs text-amber-600">{t('createTemplateFirst')}</p>
              )}
            </div>

            {selectedTemplateId === '__preset__' && (
              <div className="mb-4 p-3 rounded-lg bg-neutral-50 text-sm text-neutral-700">
                {formData.presetMessage}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">{t('selectContacts')}</label>
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder={t('searchContactsPlaceholder')}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm mb-2"
              />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200">
                {filteredCustomers.length === 0 ? (
                  <p className="p-4 text-sm text-neutral-500 text-center">{t('noCustomers')}</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 px-4 py-2 border-b border-neutral-200 bg-neutral-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                        onChange={(e) => toggleAllContacts(e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                      <span className="text-sm font-medium">{t('selectAll')}</span>
                    </label>
                    {filteredCustomers.map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-neutral-50 ${
                          !c.phone?.trim() ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(c.id)}
                          onChange={() => toggleContact(c.id)}
                          disabled={!c.phone?.trim()}
                          className="rounded border-neutral-300"
                        />
                        <span className="text-sm flex-1">
                          {c.firstName} {c.lastName}
                          {c.phone && (
                            <span className="text-neutral-500 ml-1">· {c.phone}</span>
                          )}
                        </span>
                        {!c.phone?.trim() && (
                          <span className="text-xs text-amber-600">{t('noPhone')}</span>
                        )}
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>

            {selectedContacts.length > 0 && messageToSend && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700">
                  {t('openWhatsAppFor')} ({customersWithPhone.length} {t('contacts')})
                </p>
                <div className="flex flex-wrap gap-2">
                  {customersWithPhone.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openWhatsApp(c, messageToSend)}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                    >
                      <span>WhatsApp</span>
                      <span className="font-medium">
                        {c.firstName} {c.lastName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedContacts.length > 0 && !messageToSend && (
              <p className="text-sm text-amber-600">{t('selectTemplateFirst')}</p>
            )}

            {selectedContacts.length > 0 && messageToSend && customersWithPhone.length === 0 && (
              <p className="text-sm text-amber-600">{t('noContactsWithPhone')}</p>
            )}
          </div>

          <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <h3 className="font-medium text-neutral-800 mb-2">{t('howItWorksTitle')}</h3>
            <p className="text-sm text-neutral-600 mb-3">{t('howItWorksManual')}</p>
            <ol className="list-decimal list-inside text-sm text-neutral-600 space-y-1">
              <li>{t('step1New')}</li>
              <li>{t('step2New')}</li>
              <li>{t('step3')}</li>
              <li>{t('step4')}</li>
            </ol>
          </div>
        </>
      )}

      {activeTab === 'conversations' && business?.id && (
        <WhatsAppConversationsTab
          businessId={business.id}
          whatsappConnected={whatsappConnected}
          isAutomated={isAutomated}
          customers={customers}
        />
      )}

      {activeTab === 'config' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Config: number + templates */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-6">
          <h2 className="text-lg font-semibold">{t('configTitle')}</h2>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('numberLabel')}</label>
            <input
              type="tel"
              value={formData.number || ''}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="+5511999999999"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">{t('numberHint')}</p>
          </div>

          {/* Message templates */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-2">{t('templatesTitle')}</h3>
            <p className="text-xs text-neutral-500 mb-3">{t('templatesHint')}</p>

            {editingTemplate ? (
              <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder={t('templateNamePlaceholder')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={newTemplateBody}
                  onChange={(e) => setNewTemplateBody(e.target.value)}
                  placeholder={t('presetMessagePlaceholder')}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUpdateTemplate}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
                  >
                    {t('templateSave')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(null);
                      setNewTemplateName('');
                      setNewTemplateBody('');
                    }}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    {t('templateCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder={t('templateNamePlaceholder')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={newTemplateBody}
                  onChange={(e) => setNewTemplateBody(e.target.value)}
                  placeholder={t('presetMessagePlaceholder')}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddTemplate}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
                >
                  {t('templateAdd')}
                </button>
              </div>
            )}

            {templates.length > 0 && (
              <ul className="space-y-2">
                {templates.map((tmpl) => (
                  <li
                    key={tmpl.id}
                    className="flex items-start justify-between rounded-lg border border-neutral-200 p-3 bg-white"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 text-sm">{tmpl.name}</p>
                      <p className="text-xs text-neutral-600 mt-0.5 truncate">{tmpl.body}</p>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditTemplate(tmpl)}
                        className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                      >
                        {t('templateEdit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        {t('templateDelete')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Legacy preset message - keep if no templates yet */}
          {!hasTemplates && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('presetMessageLabel')}</label>
              <textarea
                value={formData.presetMessage || ''}
                onChange={(e) => setFormData({ ...formData, presetMessage: e.target.value })}
                placeholder={t('presetMessagePlaceholder')}
                rows={4}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-neutral-500">{t('presetMessageHint')}</p>
            </div>
          )}

          {isAutomated && whatsappConnected && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="font-medium text-neutral-900 mb-2">{t('bookingConfirmationsTitle')}</h3>
              <p className="text-sm text-neutral-600 mb-3">{t('bookingConfirmationsDesc')}</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendConfirmationsViaWhatsApp}
                  onChange={(e) => handleToggleWhatsAppConfirmations(e.target.checked)}
                  disabled={saveMutation.isPending}
                  className="rounded border-neutral-300"
                />
                <span className="text-sm">{t('sendViaWhatsApp')}</span>
              </label>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saveMutation.isPending ? t('saving') : t('save')}
            </button>
          </div>
        </div>
        </form>
      )}
    </div>
  );
}

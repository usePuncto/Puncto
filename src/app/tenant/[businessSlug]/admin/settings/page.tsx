'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminSettingsPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'branding'>('general');

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
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 font-medium ${activeTab === 'branding' ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
        >
          Branding {hasWhiteLabel && <span className="text-xs text-green-600">(White-label)</span>}
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'general' && (
          <>
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Informações da Empresa</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={business?.displayName || ''}
                    readOnly
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={business?.email || ''}
                    readOnly
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={business?.phone || ''}
                    readOnly
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50"
                  />
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-4">
                Para alterar informações, entre em contato com o suporte.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Assinatura</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Plano</span>
                  <span className="text-sm font-medium capitalize">{business?.subscription?.tier || 'free'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Status</span>
                  <span className="text-sm font-medium capitalize">{business?.subscription?.status || 'active'}</span>
                </div>
              </div>
            </div>
          </>
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

function BrandingSettings({ business, branding, hasWhiteLabel, onSave, isLoading }: any) {
  const [formData, setFormData] = useState({
    logoUrl: branding?.logoUrl || '',
    coverUrl: branding?.coverUrl || '',
    primaryColor: branding?.primaryColor || '',
    secondaryColor: branding?.secondaryColor || '',
    faviconUrl: branding?.faviconUrl || '',
    customCSS: branding?.customCSS || '',
    hidePunctoBranding: branding?.hidePunctoBranding || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold mb-4">Branding & White-label</h2>
      {!hasWhiteLabel && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            White-label features (custom CSS, hide branding) require Enterprise plan. Basic branding customization is available.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            {formData.logoUrl && (
              <img src={formData.logoUrl} alt="Logo preview" className="mt-2 h-16 w-auto object-contain" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Cover Image URL</label>
            <input
              type="url"
              value={formData.coverUrl}
              onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
              placeholder="https://example.com/cover.jpg"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            {formData.coverUrl && (
              <img src={formData.coverUrl} alt="Cover preview" className="mt-2 h-24 w-full object-cover rounded" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Primary Color</label>
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Secondary Color</label>
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Favicon URL</label>
            <input
              type="url"
              value={formData.faviconUrl}
              onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
              placeholder="https://example.com/favicon.ico"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {hasWhiteLabel && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Custom CSS</label>
              <textarea
                value={formData.customCSS}
                onChange={(e) => setFormData({ ...formData, customCSS: e.target.value })}
                placeholder=".custom-class { color: red; }"
                rows={6}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Custom CSS will be injected into public booking pages. Use with caution.
              </p>
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
                Hide Puncto branding on public pages
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
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

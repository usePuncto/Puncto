'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Script from 'next/script';
import type { WhatsAppConfig } from '@/types/business';

declare global {
  interface Window {
    FB?: {
      login: (callback: (res: { authResponse?: { code?: string } }) => void, opts: { config_id: string; response_type: string; override_default_response_type: boolean }) => void;
      init: (opts: { appId: string; cookie: boolean; xfbml: boolean }) => void;
    };
    fbAsyncInit?: () => void;
  }
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

export default function AdminWhatsAppPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const t = useTranslations('whatsapp');

  const tier = business?.subscription?.tier || 'free';
  const planId = TIER_TO_PLAN[tier] || 'gratis';
  const isAutomated = planId === 'growth' || planId === 'pro' || planId === 'enterprise';

  const settings = business?.settings;
  const whatsapp = settings?.whatsapp || {};

  const [formData, setFormData] = useState<Partial<WhatsAppConfig>>({
    number: whatsapp.number || business?.phone || '',
    presetMessage: whatsapp.presetMessage || '',
  });

  useEffect(() => {
    const w = business?.settings?.whatsapp;
    if (w || business?.phone) {
      setFormData((prev) => ({
        ...prev,
        number: w?.number || business?.phone || prev.number || '',
        presetMessage: w?.presetMessage ?? prev.presetMessage ?? '',
      }));
    }
  }, [business?.id, business?.phone]);

  const saveMutation = useMutation({
    mutationFn: async (data: { number: string; presetMessage?: string }) => {
      // Only persist user-facing fields. API credentials stay in env vars (backend only).
      const res = await fetch(`/api/settings?businessId=${business?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            whatsapp: {
              ...whatsapp,
              number: data.number,
              presetMessage: data.presetMessage,
            },
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', business?.id] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      number: formData.number || '',
      presetMessage: formData.presetMessage || undefined,
    });
  };

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID;

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['whatsapp-status', business?.id],
    queryFn: async () => {
      const res = await fetch(`/api/whatsapp/status?businessId=${business?.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!business?.id && isAutomated,
  });

  const connectMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business?.id, code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to connect');
      }
      return res.json();
    },
    onSuccess: (data) => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['business', business?.id] });
      setFormData((prev) => ({ ...prev, number: data.phoneNumber || prev.number }));
    },
  });

  const handleConnectWhatsApp = useCallback(() => {
    if (!window.FB || !configId || !business?.id) return;
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (code) connectMutation.mutate(code);
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
      }
    );
  }, [configId, business?.id, connectMutation]);

  const whatsappConnected = status?.connected ?? false;

  return (
    <div>
      {appId && (
        <Script
          id="fb-sdk"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({ appId: '${appId}', cookie: true, xfbml: true });
              };
              (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = 'https://connect.facebook.net/en_US/sdk.js';
                fjs.parentNode.insertBefore(js, fjs);
              }(document, 'script', 'facebook-jssdk'));
            `,
          }}
        />
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-600 mt-2">{t('subtitle')}</p>
      </div>

      {/* Connect WhatsApp - automated tier only */}
      {isAutomated && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-2">{t('connectTitle')}</h2>
          {whatsappConnected ? (
            <div className="flex items-center gap-2 text-green-700">
              <span>✓</span>
              <span>{t('connected')} {status?.phoneNumber && `(${status.phoneNumber})`}</span>
            </div>
          ) : appId && configId ? (
            <div>
              <p className="text-sm text-neutral-600 mb-3">{t('connectDesc')}</p>
              <button
                type="button"
                onClick={handleConnectWhatsApp}
                disabled={connectMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {connectMutation.isPending ? t('connecting') : t('connectButton')}
              </button>
              {connectMutation.isError && (
                <p className="mt-2 text-sm text-red-600">{connectMutation.error?.message}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">{t('connectNotConfigured')}</p>
          )}
        </div>
      )}

      {/* Mode badge */}
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isAutomated ? '🤖' : '✋'}</span>
          <div>
            <p className="font-medium text-neutral-900">
              {isAutomated ? t('modeAutomated') : t('modeManual')}
            </p>
            <p className="text-sm text-neutral-600">
              {isAutomated ? t('modeAutomatedDesc') : t('modeManualDesc')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-6">
          <h2 className="text-lg font-semibold">{t('configTitle')}</h2>

          {/* Business WhatsApp number - used for manual link display and automated API */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t('numberLabel')}
            </label>
            <input
              type="tel"
              value={formData.number || ''}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="+5511999999999"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">{t('numberHint')}</p>
          </div>

          {/* Preset message - for manual mode: pre-filled when user opens WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t('presetMessageLabel')}
            </label>
            <textarea
              value={formData.presetMessage || ''}
              onChange={(e) => setFormData({ ...formData, presetMessage: e.target.value })}
              placeholder={t('presetMessagePlaceholder')}
              rows={4}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">{t('presetMessageHint')}</p>
          </div>

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

        {/* How it works - manual mode */}
        {!isAutomated && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <h3 className="font-medium text-neutral-800 mb-2">{t('howItWorksTitle')}</h3>
            <p className="text-sm text-neutral-600 mb-3">{t('howItWorksManual')}</p>
            <ol className="list-decimal list-inside text-sm text-neutral-600 space-y-1">
              <li>{t('step1')}</li>
              <li>{t('step2')}</li>
              <li>{t('step3')}</li>
              <li>{t('step4')}</li>
            </ol>
          </div>
        )}

        {isAutomated && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <h3 className="font-medium text-neutral-800 mb-2">{t('howItWorksTitle')}</h3>
            <p className="text-sm text-neutral-600">{t('howItWorksAutomated')}</p>
          </div>
        )}
      </form>
    </div>
  );
}

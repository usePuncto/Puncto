'use client';

import React, { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';

export default function SubscriptionPage() {
  const { business } = useBusiness();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening subscription portal:', error);
      alert('Erro ao abrir portal de assinatura');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | any) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Assinatura</h1>
        <p className="text-neutral-600 mt-2">Gerencie sua assinatura do Puncto</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-neutral-700">Plano Atual</span>
            <span className="font-semibold capitalize">{business.subscription.tier}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-700">Status</span>
            <span className={`capitalize font-medium ${
              business.subscription.status === 'active' ? 'text-green-600' :
              business.subscription.status === 'trial' ? 'text-blue-600' :
              business.subscription.status === 'suspended' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {business.subscription.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-700">Período Atual</span>
            <span className="text-sm text-neutral-600">
              {formatDate(business.subscription.currentPeriodStart)} - {formatDate(business.subscription.currentPeriodEnd)}
            </span>
          </div>

          {business.subscription.cancelAtPeriodEnd && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Sua assinatura será cancelada ao final do período atual.
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <button
              onClick={handleManageSubscription}
              disabled={loading || !business.subscription.stripeCustomerId}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Carregando...' : 'Gerenciar Assinatura'}
            </button>
            {!business.subscription.stripeCustomerId && (
              <p className="mt-2 text-xs text-neutral-500 text-center">
                Configure uma assinatura para gerenciar seu plano
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

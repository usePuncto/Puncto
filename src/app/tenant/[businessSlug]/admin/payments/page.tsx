'use client';

import React, { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { usePayments } from '@/lib/queries/payments';
import { usePaymentLinks } from '@/lib/queries/paymentLinks';
import { PaymentLinkForm } from '@/components/admin/PaymentLinkForm';

export default function PaymentsPage() {
  const { business } = useBusiness();
  const { data: payments, isLoading } = usePayments(business.id);
  const { data: paymentLinks, isLoading: paymentLinksLoading } = usePaymentLinks(business.id);
  const [showPaymentLinkForm, setShowPaymentLinkForm] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [managingStripe, setManagingStripe] = useState(false);

  const hasStripeAccount = Boolean(business.stripeConnectAccountId);
  const isStripeOnboardingComplete = Boolean(business.stripeConnectOnboardingComplete);

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
      } else {
        alert('Stripe Connect criado, mas URL de onboarding não retornou.');
      }
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
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
    // Refresh payments list
    window.location.reload();
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copiado!');
    } catch {
      prompt('Copie o link abaixo:', text);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Stripe Connect</h2>
            <p className="text-sm text-neutral-600 mt-1">
              {hasStripeAccount && isStripeOnboardingComplete
                ? 'A conta Stripe está vinculada a este negócio para receber pagamentos. Comissões entre profissionais não são repassadas automaticamente pelo Stripe.'
                : hasStripeAccount
                  ? 'A conta Stripe do negócio foi criada, mas o onboarding ainda não foi concluído.'
                : 'Conecte o Stripe ao negócio para receber pagamentos online. Use o e-mail cadastrado nas configurações do negócio.'}
            </p>
          </div>

          {hasStripeAccount && isStripeOnboardingComplete ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                Conectado
              </span>
              <button
                onClick={handleManageStripe}
                disabled={managingStripe}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {managingStripe ? 'Abrindo...' : 'Gerenciar no Stripe'}
              </button>
            </div>
          ) : hasStripeAccount ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                Onboarding pendente
              </span>
              <button
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {connectingStripe ? 'Abrindo...' : 'Continuar onboarding'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {connectingStripe ? 'Conectando...' : 'Conectar Stripe'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Pagamentos</h1>
          <p className="text-neutral-600 mt-2">Gerencie pagamentos e links de pagamento</p>
        </div>
        <button
          onClick={() => setShowPaymentLinkForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo Link de Pagamento
        </button>
      </div>

      {showPaymentLinkForm && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Criar Link de Pagamento</h2>
          <PaymentLinkForm
            businessId={business.id}
            onSubmit={handleCreatePaymentLink}
            onCancel={() => setShowPaymentLinkForm(false)}
          />
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Links de Pagamento</h2>

          {paymentLinksLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
              <p className="mt-4 text-neutral-600">Carregando links...</p>
            </div>
          ) : !paymentLinks || paymentLinks.length === 0 ? (
            <div className="text-center py-8 text-neutral-600">Nenhum link encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Nome</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Valor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLinks.slice(0, 10).map((link) => (
                    <tr key={link.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <div className="font-medium">{link.name}</div>
                        {link.qrCodeUrl ? (
                          <img
                            src={link.qrCodeUrl}
                            alt={`QR ${link.name}`}
                            className="mt-2 h-10 w-10 rounded border border-neutral-200 object-contain"
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        {formatAmount(link.amount, link.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            link.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {link.active ? 'ativo' : 'inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(link.stripePaymentLinkUrl, '_blank')}
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            Abrir
                          </button>
                          <button
                            onClick={() => handleCopy(link.stripePaymentLinkUrl)}
                            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                          >
                            Copiar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="text-lg font-semibold mb-4">Histórico de Pagamentos</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
              <p className="mt-4 text-neutral-600">Carregando pagamentos...</p>
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-8 text-neutral-600">
              Nenhum pagamento encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Data</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Valor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {payment.createdAt instanceof Date
                          ? payment.createdAt.toLocaleDateString('pt-BR')
                          : new Date((payment.createdAt as any)?.seconds * 1000).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {payment.customerName || payment.customerEmail || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        {formatAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 capitalize">
                        {payment.paymentMethod}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

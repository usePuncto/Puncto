'use client';

import React, { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { usePayments } from '@/lib/queries/payments';
import { PaymentLinkForm } from '@/components/admin/PaymentLinkForm';

export default function PaymentsPage() {
  const { business } = useBusiness();
  const { data: payments, isLoading } = usePayments(business.id);
  const [showPaymentLinkForm, setShowPaymentLinkForm] = useState(false);

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

  return (
    <div className="space-y-6">
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

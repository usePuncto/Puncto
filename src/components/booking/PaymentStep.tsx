'use client';

import React, { useState } from 'react';
import { useCreateCheckoutSession } from '@/lib/queries/payments';
import { loadStripe } from '@stripe/stripe-js';
import { getStripePublishableKey } from '@/lib/stripe/publishable';
import type { Service } from '@/types';

interface PaymentStepProps {
  businessId: string;
  bookingId: string;
  service: Service;
  amount: number; // Amount in cents
  currency: string;
  customerEmail?: string;
  customerName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentStep({
  businessId,
  bookingId,
  service,
  amount,
  currency,
  customerEmail,
  customerName,
  onSuccess,
  onCancel,
}: PaymentStepProps) {
  const [processing, setProcessing] = useState(false);
  const createCheckout = useCreateCheckoutSession();

  const handlePayment = async () => {
    try {
      setProcessing(true);

      // Determine payment type based on service settings
      const paymentType = service.requiresDeposit && service.depositAmount ? 'deposit' : 'full';
      const paymentAmount = paymentType === 'deposit' && service.depositAmount
        ? Math.round(service.depositAmount * 100) // Convert to cents
        : amount;

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const result = await createCheckout.mutateAsync({
        businessId,
        amount: paymentAmount,
        currency: currency.toLowerCase(),
        customerEmail,
        customerName,
        description: `Payment for ${service.name}`,
        metadata: {
          businessId,
          bookingId,
          serviceId: service.id,
          paymentType,
          amount: paymentAmount.toString(),
          currency,
        },
        successUrl: `${baseUrl}/tenant?subdomain=${businessId}&bookingId=${bookingId}&payment=success`,
        cancelUrl: `${baseUrl}/tenant?subdomain=${businessId}&bookingId=${bookingId}&payment=canceled`,
        paymentMethodTypes: ['card', 'pix'],
      });

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      } else if (result.sessionId) {
        // If we have session ID but no URL, load Stripe and redirect
        const stripe = await loadStripe(getStripePublishableKey());
        if (stripe) {
          await (stripe as any).redirectToCheckout({ sessionId: result.sessionId });
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      setProcessing(false);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const isDeposit = service.requiresDeposit && service.depositAmount;
  const paymentAmount = isDeposit && service.depositAmount
    ? Math.round(service.depositAmount * 100)
    : amount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Pagamento</h2>
        <p className="text-neutral-600">Complete o pagamento para confirmar seu agendamento</p>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-neutral-700">Serviço:</span>
            <span className="font-medium">{service.name}</span>
          </div>

          {isDeposit && (
            <>
              <div className="flex justify-between items-center text-neutral-600">
                <span>Valor total:</span>
                <span>{formatAmount(amount)}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>Valor do serviço:</span>
                <span>{formatAmount(amount)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-semibold">Entrada:</span>
                <span className="font-bold text-lg">{formatAmount(paymentAmount)}</span>
              </div>
            </>
          )}

          {!isDeposit && (
            <div className="flex justify-between items-center border-t pt-2">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-lg">{formatAmount(paymentAmount)}</span>
            </div>
          )}

          <div className="mt-4 text-sm text-neutral-500">
            {isDeposit ? (
              <p>Você pagará a entrada agora e o restante no dia do serviço.</p>
            ) : (
              <p>O pagamento completo será processado agora.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-3 rounded-lg border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handlePayment}
          disabled={processing}
          className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processando...' : `Pagar ${formatAmount(paymentAmount)}`}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect } from 'react';
import type { Payment } from '@/types/payment';

type Props = {
  payment: Payment;
  onClose: () => void;
  formatAmount: (cents: number, currency: string) => string;
  formatInstant: (value: unknown) => string;
  statusLabel: (status: string) => string;
};

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[160px_1fr] sm:gap-3 py-2 border-b border-neutral-100 last:border-0">
      <dt className="text-sm font-medium text-neutral-500">{label}</dt>
      <dd className={`text-sm text-neutral-900 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

export function PaymentDetailModal({
  payment,
  onClose,
  formatAmount,
  formatInstant,
  statusLabel,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const meta = payment.metadata || {};
  const metaEntries = Object.entries(meta).filter(([, v]) => v !== undefined && v !== '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <h2 id="payment-detail-title" className="text-lg font-semibold text-neutral-900">
            Detalhe do pagamento
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-1">
          <Row label="ID interno" value={payment.id} mono />
          <Row label="Status" value={statusLabel(payment.status)} />
          <Row label="Valor" value={formatAmount(payment.amount, payment.currency)} />
          <Row label="Moeda" value={payment.currency.toUpperCase()} />
          <Row label="Método" value={String(payment.paymentMethod)} />
          <Row label="Cliente" value={payment.customerName || payment.customerEmail || '—'} />
          {(payment.customerEmail || payment.customerName) && (
            <Row label="E-mail" value={payment.customerEmail || '—'} />
          )}
          {payment.bookingId && <Row label="Agendamento" value={payment.bookingId} mono />}
          {payment.stripePaymentLinkStripeId && (
            <Row label="Stripe Payment Link" value={payment.stripePaymentLinkStripeId} mono />
          )}
          {payment.stripePaymentIntentId && (
            <Row label="PaymentIntent" value={payment.stripePaymentIntentId} mono />
          )}
          {payment.stripeCheckoutSessionId && (
            <Row label="Checkout Session" value={payment.stripeCheckoutSessionId} mono />
          )}
          {payment.stripeChargeId && <Row label="Charge" value={payment.stripeChargeId} mono />}
          {payment.description && <Row label="Descrição" value={payment.description} />}
          {payment.refundedAmount != null && payment.refundedAmount > 0 && (
            <Row
              label="Reembolsado"
              value={formatAmount(payment.refundedAmount, payment.currency)}
            />
          )}
        </div>

        <div className="border-t border-neutral-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-neutral-800 mb-2">Linha do tempo</h3>
          <dl className="space-y-1">
            <Row label="Registrado em" value={formatInstant(payment.createdAt)} />
            <Row label="Atualizado em" value={formatInstant(payment.updatedAt)} />
            <Row label="Pago em" value={formatInstant(payment.succeededAt)} />
            <Row label="Falha em" value={formatInstant(payment.failedAt)} />
          </dl>
        </div>

        {metaEntries.length > 0 && (
          <div className="border-t border-neutral-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-800 mb-2">Metadados (Stripe)</h3>
            <ul className="space-y-2 text-sm">
              {metaEntries.map(([k, v]) => (
                <li key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <span className="font-medium text-neutral-600 shrink-0">{k}</span>
                  <span className="font-mono text-xs text-neutral-900 break-all">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-neutral-100 px-5 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

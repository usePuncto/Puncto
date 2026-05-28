'use client';

import React, { useState } from 'react';

interface PaymentLinkFormProps {
  businessId: string;
  variant?: 'payment' | 'boleto';
  onSubmit: (data: {
    name: string;
    description?: string;
    amount: number;
    currency: string;
    expiresAt?: Date;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PaymentLinkForm({
  businessId,
  variant = 'payment',
  onSubmit,
  onCancel,
}: PaymentLinkFormProps) {
  const isBoleto = variant === 'boleto';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const effectiveCurrency = isBoleto ? 'BRL' : currency;
  const [expiresDays, setExpiresDays] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !amount) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      alert('Valor inválido');
      return;
    }

    setSubmitting(true);
    try {
      const expiresAt = expiresDays 
        ? new Date(Date.now() + (expiresDays as number) * 24 * 60 * 60 * 1000)
        : undefined;

      await onSubmit({
        name,
        description: description || undefined,
        amount: amountInCents,
        currency: effectiveCurrency.toLowerCase(),
        expiresAt,
      });
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert(isBoleto ? 'Erro ao gerar boleto' : 'Erro ao criar link de pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {isBoleto ? 'Nome / referência do boleto *' : 'Nome do Link *'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          placeholder={isBoleto ? 'Ex: Mensalidade março' : 'Ex: Pagamento de Consulta'}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Descrição (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          rows={3}
          placeholder="Descrição do pagamento"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Valor *
          </label>
          <div className="flex items-center">
            <span className="mr-2 text-neutral-600">{effectiveCurrency}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Moeda
          </label>
          <select
            value={effectiveCurrency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={isBoleto}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
          >
            <option value="BRL">BRL (R$)</option>
            {!isBoleto && (
              <>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </>
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Expira em (dias, opcional)
        </label>
        <input
          type="number"
          min="1"
          value={expiresDays}
          onChange={(e) => setExpiresDays(e.target.value ? parseInt(e.target.value) : '')}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Ex: 30"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Deixe em branco para não expirar
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Gerando…' : isBoleto ? 'Gerar boleto' : 'Criar Link'}
        </button>
      </div>
    </form>
  );
}

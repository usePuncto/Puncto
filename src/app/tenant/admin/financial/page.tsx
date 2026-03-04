'use client';

import React, { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function FinancialPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    type: 'expense' as 'expense' | 'revenue',
    account: 'expenses',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const handleAddOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const amount = parseFloat(addForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setAddError('Valor inválido');
      return;
    }
    if (!addForm.description.trim()) {
      setAddError('Descrição é obrigatória');
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch('/api/ledger/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          entry: {
            account: addForm.type === 'expense' ? 'expenses' : 'revenue',
            type: addForm.type === 'expense' ? 'debit' : 'credit',
            amount: amount,
            description: addForm.description.trim(),
            date: addForm.date,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }
      setShowAddForm(false);
      setAddForm({ type: 'expense', account: 'expenses', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      queryClient.invalidateQueries({ queryKey: ['pnl', business.id] });
      queryClient.invalidateQueries({ queryKey: ['cashflow', business.id] });
    } catch (err: any) {
      setAddError(err.message || 'Erro ao adicionar');
    } finally {
      setAddLoading(false);
    }
  };

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const { data: pnl, isLoading: pnlLoading } = useQuery({
    queryKey: ['pnl', business.id, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        businessId: business.id,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/reports/pnl?${params}`);
      if (!response.ok) throw new Error('Failed to fetch P&L report');
      return response.json();
    },
  });

  const { data: cashflow, isLoading: cashflowLoading } = useQuery({
    queryKey: ['cashflow', business.id, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        businessId: business.id,
        startDate,
        endDate,
        period: 'daily',
      });
      const response = await fetch(`/api/reports/cashflow?${params}`);
      if (!response.ok) throw new Error('Failed to fetch cash flow report');
      return response.json();
    },
  });

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Relatórios Financeiros</h1>
          <p className="text-neutral-600 mt-2">Visão geral financeira do seu negócio</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Adicionar ocorrência
          </button>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {showAddForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Nova ocorrência financeira</h2>
          <form onSubmit={handleAddOccurrence} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo</label>
              <select
                value={addForm.type}
                onChange={(e) => setAddForm({ ...addForm, type: e.target.value as 'expense' | 'revenue' })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="expense">Despesa</option>
                <option value="revenue">Receita</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Descrição</label>
              <input
                type="text"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Ex: Aluguel do mês"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Data</label>
              <input
                type="date"
                value={addForm.date}
                onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addLoading}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {addLoading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(null); }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* P&L Report */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Demonstração de Resultados (P&L)</h2>
        
        {pnlLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          </div>
        ) : pnl ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-neutral-700">Receita Bruta</span>
              <span className="font-semibold text-green-600">{formatAmount(pnl.revenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-neutral-600">
              <span>Reembolsos</span>
              <span>-{formatAmount(pnl.refunds)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">Receita Líquida</span>
              <span className="font-semibold">{formatAmount(pnl.grossProfit)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-neutral-600">
              <span>Despesas</span>
              <span>-{formatAmount(pnl.expenses)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t-2 border-neutral-300">
              <span className="font-bold text-lg">Lucro Líquido</span>
              <span className={`font-bold text-lg ${pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(pnl.netProfit)}
              </span>
            </div>
            <div className="text-sm text-neutral-500 mt-2">
              Margem de Lucro: {pnl.profitMargin.toFixed(2)}%
            </div>
          </div>
        ) : null}
      </div>

      {/* Cash Flow Summary */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Fluxo de Caixa</h2>
        
        {cashflowLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          </div>
        ) : cashflow?.summary ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-neutral-700">Total de Entradas</span>
              <span className="font-semibold text-green-600">{formatAmount(cashflow.summary.totalInflow)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-neutral-700">Total de Saídas</span>
              <span className="font-semibold text-red-600">{formatAmount(cashflow.summary.totalOutflow)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t-2 border-neutral-300">
              <span className="font-bold text-lg">Fluxo Líquido</span>
              <span className={`font-bold text-lg ${cashflow.summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(cashflow.summary.netFlow)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

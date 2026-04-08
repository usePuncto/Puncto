'use client';

import React, { useMemo, useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePayments } from '@/lib/queries/payments';

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
      queryClient.invalidateQueries({ queryKey: ['ledgerEntries', business.id] });
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

  const { data: pnl, isLoading: pnlLoading, isError: pnlError } = useQuery({
    queryKey: ['pnl', business?.id, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        businessId: business!.id,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/reports/pnl?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Falha ao carregar P&L');
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: cashflow, isLoading: cashflowLoading, isError: cashflowError } = useQuery({
    queryKey: ['cashflow', business?.id, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        businessId: business!.id,
        startDate,
        endDate,
        period: 'daily',
      });
      const response = await fetch(`/api/reports/cashflow?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Falha ao carregar fluxo de caixa');
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: stripePayments, isLoading: stripePaymentsLoading } = usePayments(business.id);

  const filteredStripePayments = useMemo(() => {
    if (!stripePayments) return [];
    const startMs = startDate ? new Date(startDate).getTime() : null;
    const endMs = endDate ? new Date(endDate + 'T23:59:59.999').getTime() : null;

    const toMs = (value: unknown): number | null => {
      if (!value) return null;
      if (value instanceof Date) return value.getTime();
      const s = (value as { seconds?: number })?.seconds;
      if (typeof s === 'number') return s * 1000;
      return null;
    };

    return stripePayments.filter((p) => {
      const ms = toMs(p.succeededAt) ?? toMs(p.createdAt);
      if (ms === null) return false;
      if (startMs !== null && ms < startMs) return false;
      if (endMs !== null && ms > endMs) return false;
      return true;
    });
  }, [stripePayments, startDate, endDate]);

  const { data: ledgerData, isLoading: entriesLoading, isError: entriesError } = useQuery({
    queryKey: ['ledgerEntries', business?.id, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        businessId: business!.id,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/ledger/entries?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Falha ao carregar ocorrências');
      return data;
    },
    enabled: !!business?.id,
  });

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDateTimePt = (value: unknown) => {
    if (!value) return '—';
    if (value instanceof Date) {
      return value.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }
    const s = (value as { seconds?: number })?.seconds;
    if (typeof s === 'number') {
      return new Date(s * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }
    return '—';
  };

  const paymentStatusPt = (status: string) => {
    const map: Record<string, string> = {
      succeeded: 'Pago',
      pending: 'Pendente',
      processing: 'Processando',
      failed: 'Falhou',
      refunded: 'Reembolsado',
      partially_refunded: 'Parcialmente reembolsado',
      canceled: 'Cancelado',
    };
    return map[status] || status;
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

      {!business?.id && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          Carregando dados do negócio...
        </div>
      )}

      {/* Stripe payments (same source as P&L / fluxo de caixa) */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Pagamentos Stripe</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Recebimentos via checkout e links de pagamento no período selecionado (filtrado por data de pagamento ou, se ausente, data de registro).
        </p>
        {stripePaymentsLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          </div>
        ) : filteredStripePayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-2 pr-4">Pago em</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Método</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredStripePayments.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {formatDateTimePt(p.succeededAt || p.createdAt)}
                    </td>
                    <td className="py-3 pr-4">{p.customerName || p.customerEmail || '—'}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {paymentStatusPt(p.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 capitalize">{p.paymentMethod}</td>
                    <td className="py-3 text-right font-medium text-green-600">
                      {formatAmount(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-neutral-500 py-4 text-sm">
            Nenhum pagamento Stripe no período. Os totais de receita no P&L e no fluxo de caixa também dependem desses registros.
          </p>
        )}
      </div>

      {/* Registered occurrences list */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Ocorrências registradas</h2>
        {entriesLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          </div>
        ) : entriesError ? (
          <p className="text-red-600 py-4 text-sm">Erro ao carregar ocorrências. Verifique o console e as credenciais do Firebase.</p>
        ) : ledgerData?.entries?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Descrição</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.entries.map((entry: { id: string; type: string; description: string; amount: number; date: string }) => (
                  <tr key={entry.id} className="border-b border-neutral-100">
                    <td className="py-3 pr-4">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.type === 'revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {entry.type === 'revenue' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{entry.description}</td>
                    <td className={`py-3 text-right font-medium ${entry.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'revenue' ? '' : '-'}{formatAmount(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-neutral-500 py-4">Nenhuma ocorrência no período selecionado. Clique em &quot;+ Adicionar ocorrência&quot; para registrar.</p>
        )}
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
        ) : pnlError ? (
          <p className="text-red-600 py-4 text-sm">Erro ao carregar P&L. Verifique se o negócio está correto e se as APIs estão acessíveis.</p>
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
        ) : !business?.id ? null : (
          <p className="text-neutral-500 py-4 text-sm">Nenhum dado disponível para o período.</p>
        )}
      </div>

      {/* Cash Flow Summary */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Fluxo de Caixa</h2>
        
        {cashflowLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          </div>
        ) : cashflowError ? (
          <p className="text-red-600 py-4 text-sm">Erro ao carregar fluxo de caixa. Verifique se o negócio está correto e se as APIs estão acessíveis.</p>
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
        ) : !business?.id ? null : (
          <p className="text-neutral-500 py-4 text-sm">Nenhum dado disponível para o período.</p>
        )}
      </div>
    </div>
  );
}

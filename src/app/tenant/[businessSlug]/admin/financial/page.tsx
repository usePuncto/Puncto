'use client';

import React, { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useQuery } from '@tanstack/react-query';

export default function FinancialPage() {
  const { business } = useBusiness();
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
        <div className="flex gap-4">
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

'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { PurchaseOrder } from '@/types/purchases';

export default function AdminPurchasesPage() {
  const { business } = useBusiness();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPurchaseOrders();
  }, [business?.id]);

  const loadPurchaseOrders = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/purchases?businessId=${business.id}`);
      const data = await res.json();
      setPurchaseOrders(data.purchaseOrders || []);
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-neutral-100 text-neutral-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'sent':
        return 'Enviado';
      case 'confirmed':
        return 'Confirmado';
      case 'received':
        return 'Recebido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Compras</h1>
          <p className="text-neutral-600 mt-2">Gerencie ordens de compra e fornecedores</p>
        </div>

        <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800">
          + Nova Ordem de Compra
        </button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">PO #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Fornecedor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Total</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Data</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  #{po.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600">
                  {po.supplierId}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(po.status)}`}>
                    {getStatusLabel(po.status)}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{formatPrice(po.total)}</td>
                <td className="px-4 py-3 text-sm text-neutral-600">
                  {new Date(po.createdAt as Date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  {po.status === 'confirmed' && (
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      Receber
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {purchaseOrders.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            Nenhuma ordem de compra encontrada.
          </div>
        )}
      </div>
    </div>
  );
}

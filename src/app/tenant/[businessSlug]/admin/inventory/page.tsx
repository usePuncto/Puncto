'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { InventoryItem } from '@/types/inventory';

export default function AdminInventoryPage() {
  const { business } = useBusiness();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lowStock'>('all');

  useEffect(() => {
    loadItems();
  }, [business?.id, filter]);

  const loadItems = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);
      const url = `/api/inventory?businessId=${business.id}${filter === 'lowStock' ? '&lowStock=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
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
          <h1 className="text-3xl font-bold text-neutral-900">Estoque</h1>
          <p className="text-neutral-600 mt-2">Gerencie o inventário</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              filter === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('lowStock')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              filter === 'lowStock'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Estoque Baixo
          </button>
          <button
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            + Novo Item
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Item</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Categoria</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Estoque</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Mínimo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Custo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLowStock = item.currentStock <= item.minStock;
              return (
                <tr key={item.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-neutral-900">{item.name}</p>
                      {item.sku && (
                        <p className="text-xs text-neutral-500">SKU: {item.sku}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{item.category}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-neutral-900'}`}>
                      {item.currentStock} {item.unit}
                    </span>
                    {isLowStock && (
                      <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        Baixo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {item.minStock} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{formatPrice(item.cost)}</td>
                  <td className="px-4 py-3">
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            Nenhum item no inventário.
          </div>
        )}
      </div>
    </div>
  );
}

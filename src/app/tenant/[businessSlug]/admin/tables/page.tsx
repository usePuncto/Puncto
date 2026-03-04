'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useRouter } from 'next/navigation';
import { Table } from '@/types/restaurant';
import { QRCodeGenerator } from '@/components/restaurant/QRCodeGenerator';

export default function AdminTablesPage() {
  const { business } = useBusiness();
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    capacity: 4,
    location: 'indoor' as 'indoor' | 'outdoor' | 'bar',
    active: true,
  });

  useEffect(() => {
    loadTables();
  }, [business?.id]);

  const loadTables = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/tables?businessId=${business.id}`);
      const data = await res.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) return;

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          table: formData,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create table');
      }

      await loadTables();
      setIsFormOpen(false);
      setFormData({
        number: '',
        capacity: 4,
        location: 'indoor',
        active: true,
      });
    } catch (error) {
      console.error('Failed to create table:', error);
      alert('Erro ao criar mesa. Tente novamente.');
    }
  };

  const handleDelete = async (tableId: string) => {
    if (!business?.id) return;
    if (!confirm('Tem certeza que deseja excluir esta mesa?')) return;

    try {
      const res = await fetch(`/api/tables/${tableId}?businessId=${business.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete table');
      }

      await loadTables();
    } catch (error) {
      console.error('Failed to delete table:', error);
      alert('Erro ao excluir mesa. Tente novamente.');
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
          <h1 className="text-3xl font-bold text-neutral-900">Mesas</h1>
          <p className="text-neutral-600 mt-2">Gerencie as mesas do restaurante</p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          + Nova Mesa
        </button>
      </div>

      {isFormOpen && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold mb-4">Nova Mesa</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Número da Mesa *
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  required
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  placeholder="Ex: 1, 2A, VIP-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Capacidade *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  required
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Localização
              </label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value as any })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              >
                <option value="indoor">Interno</option>
                <option value="outdoor">Externo</option>
                <option value="bar">Bar</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded border-neutral-300"
              />
              <label htmlFor="active" className="text-sm font-medium text-neutral-700">
                Mesa ativa
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Criar Mesa
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table.id}
            className="rounded-lg border border-neutral-200 bg-white p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Mesa {table.number}</h3>
                <p className="text-sm text-neutral-600">
                  Capacidade: {table.capacity} pessoas
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {table.location === 'indoor' && 'Interno'}
                  {table.location === 'outdoor' && 'Externo'}
                  {table.location === 'bar' && 'Bar'}
                </p>
              </div>
              {!table.active && (
                <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                  Inativa
                </span>
              )}
            </div>

            <div className="mb-4">
              <button
                onClick={() => setSelectedTable(selectedTable?.id === table.id ? null : table)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {selectedTable?.id === table.id ? 'Ocultar' : 'Ver'} QR Code
              </button>
            </div>

            {selectedTable?.id === table.id && table.qrCodeData && (
              <div className="mb-4">
                <QRCodeGenerator
                  tableUrl={table.qrCodeData}
                  tableNumber={table.number}
                />
              </div>
            )}

            <button
              onClick={() => handleDelete(table.id)}
              className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Excluir Mesa
            </button>
          </div>
        ))}

        {tables.length === 0 && (
          <div className="col-span-full p-8 text-center text-neutral-500">
            Nenhuma mesa cadastrada. Crie a primeira mesa!
          </div>
        )}
      </div>
    </div>
  );
}

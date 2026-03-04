'use client';

import { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useCustomers, useCreateCustomer } from '@/lib/queries/customers';

export default function AdminCustomersPage() {
  const { business } = useBusiness();
  const { data: customers = [], isLoading } = useCustomers(business.id);
  const createCustomer = useCreateCustomer(business.id);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      setError('Nome e telefone são obrigatórios');
      return;
    }
    try {
      await createCustomer.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      setShowForm(false);
      setFormData({ firstName: '', lastName: '', phone: '', email: '', notes: '' });
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar cliente');
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
          <h1 className="text-3xl font-bold text-neutral-900">Clientes</h1>
          <p className="text-neutral-600 mt-2">Base de dados de clientes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Cadastrar cliente
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Novo cliente</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Nome"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Sobrenome *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Sobrenome"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Anotações sobre o cliente"
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createCustomer.isPending}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {createCustomer.isPending ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Agendamentos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Total Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 text-sm font-medium">
                    {customer.firstName} {customer.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>{customer.email || '-'}</div>
                    {customer.phone && <div className="text-neutral-500">{customer.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm">{customer.totalBookings}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((customer.totalSpent || 0) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="p-8 text-center text-neutral-500">
              Nenhum cliente cadastrado. Clique em &quot;Cadastrar cliente&quot; para adicionar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

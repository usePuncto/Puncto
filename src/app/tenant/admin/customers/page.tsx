'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCustomers, useCreateCustomer } from '@/lib/queries/customers';
import { Customer } from '@/types/booking';
import { CustomerDetailModal } from '@/components/admin/CustomerDetailModal';
import { AnamnesisFormsSection } from '@/components/admin/AnamnesisFormsSection';
import { formatPhoneInput } from '@/lib/utils/phone';

export default function AdminCustomersPage() {
  const { business } = useBusiness();
  const { firebaseUser } = useAuth();
  const isClinic = business?.industry === 'clinic';
  const isEducation = business?.industry === 'education';
  const { data: customers = [], isLoading } = useCustomers(business.id);
  const createCustomer = useCreateCustomer(business.id);
  const [activeSection, setActiveSection] = useState<'patients' | 'anamnese'>('patients');
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'spent' | 'bookings'>('name');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    birthDate: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [accessLoadingId, setAccessLoadingId] = useState<string | null>(null);
  const [subscriptionLoadingId, setSubscriptionLoadingId] = useState<string | null>(null);

  const patientsLabel = isClinic ? 'Pacientes' : isEducation ? 'Alunos' : 'Clientes';
  const registerLabel = isClinic
    ? 'Cadastrar paciente'
    : isEducation
      ? 'Cadastrar aluno'
      : 'Cadastrar cliente';
  const newPatientLabel = isClinic ? 'Novo paciente' : isEducation ? 'Novo aluno' : 'Novo cliente';
  const notesPlaceholder = isClinic
    ? 'Anotações sobre o paciente'
    : isEducation
      ? 'Anotações sobre o aluno'
      : 'Anotações sobre o cliente';
  const emptySearch = isClinic
    ? 'Nenhum paciente encontrado com os filtros aplicados.'
    : isEducation
      ? 'Nenhum aluno encontrado com os filtros aplicados.'
      : 'Nenhum cliente encontrado com os filtros aplicados.';
  const emptyList = isClinic
    ? 'Nenhum paciente cadastrado. Clique em "Cadastrar paciente" para adicionar.'
    : isEducation
      ? 'Nenhum aluno cadastrado. Clique em "Cadastrar aluno" para adicionar.'
      : 'Nenhum cliente cadastrado. Clique em "Cadastrar cliente" para adicionar.';
  const errorCreate = isClinic
    ? 'Erro ao cadastrar paciente'
    : isEducation
      ? 'Erro ao cadastrar aluno'
      : 'Erro ao cadastrar cliente';

  const searchParams = useSearchParams();
  const customerIdFromUrl = searchParams?.get('customerId') ?? null;
  useEffect(() => {
    if (customerIdFromUrl && customers.length > 0) {
      const c = customers.find((x) => x.id === customerIdFromUrl);
      if (c) setSelectedCustomer(c);
    }
  }, [customerIdFromUrl, customers]);

  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = customers;
    if (q) {
      list = customers.filter((c) => {
        const name = `${c.firstName} ${c.lastName}`.toLowerCase();
        const phone = (c.phone || '').replace(/\D/g, '');
        const email = (c.email || '').toLowerCase();
        const searchDigits = q.replace(/\D/g, '');
        return (
          name.includes(q) ||
          email.includes(q) ||
          (searchDigits.length >= 4 && phone.includes(searchDigits))
        );
      });
    }
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name': {
          const na = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nb = `${b.firstName} ${b.lastName}`.toLowerCase();
          return na.localeCompare(nb);
        }
        case 'recent': {
          const aDate = a.lastBookingAt || a.createdAt;
          const bDate = b.lastBookingAt || b.createdAt;
          const ta = aDate ? new Date(aDate as Date).getTime() : 0;
          const tb = bDate ? new Date(bDate as Date).getTime() : 0;
          return tb - ta;
        }
        case 'spent':
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'bookings':
          return (b.totalBookings || 0) - (a.totalBookings || 0);
        default:
          return 0;
      }
    });
  }, [customers, search, sortBy]);

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
        birthDate: formData.birthDate || undefined,
        notes: formData.notes.trim() || undefined,
      });
      setShowForm(false);
      setFormData({ firstName: '', lastName: '', phone: '', email: '', birthDate: '', notes: '' });
    } catch (err: any) {
      setError(err.message || errorCreate);
    }
  };

  const handleCreateStudentAccess = async (customer: Customer) => {
    if (!firebaseUser) return;
    setAccessLoadingId(customer.id);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/students/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessId: business.id,
          customerId: customer.id,
          email: customer.email,
          displayName: `${customer.firstName} ${customer.lastName}`.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar acesso');
      alert(`Acesso criado. Senha temporaria: ${data.temporaryPassword}`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar acesso');
    } finally {
      setAccessLoadingId(null);
    }
  };

  const handleCreateSubscription = async (customer: Customer) => {
    if (!firebaseUser) return;
    const amountStr = prompt('Valor da mensalidade (em R$, ex: 299.90):', '299.90');
    if (!amountStr) return;
    const cents = Math.round(Number(amountStr.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    setSubscriptionLoadingId(customer.id);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/students/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'create',
          businessId: business.id,
          customerId: customer.id,
          amount: cents,
          currency: 'brl',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar mensalidade');
      if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank');
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar mensalidade');
    } finally {
      setSubscriptionLoadingId(null);
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{patientsLabel}</h1>
          <p className="text-neutral-600 mt-2">
            {isClinic
              ? 'Base de dados de pacientes e prontuários'
              : isEducation
                ? 'Base de dados de alunos'
                : 'Base de dados de clientes'}
          </p>
        </div>
        {activeSection === 'patients' && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {registerLabel}
          </button>
        )}
      </div>

      {isClinic && (
        <div className="mb-6 flex gap-1 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveSection('patients')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeSection === 'patients'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Pacientes
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('anamnese')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeSection === 'anamnese'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Anamnese
          </button>
        </div>
      )}

      {activeSection === 'anamnese' && isClinic && (
        <AnamnesisFormsSection businessId={business.id} />
      )}

      {activeSection === 'patients' && (
        <>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="name">Nome (A–Z)</option>
          <option value="recent">Mais recentes primeiro</option>
          <option value="spent">Maior gasto</option>
          <option value="bookings">Mais agendamentos</option>
        </select>
        {search && (
          <span className="text-sm text-neutral-500">
            {filteredAndSorted.length} de {customers.length} {patientsLabel.toLowerCase()}
          </span>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">{newPatientLabel}</h2>
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
                inputMode="numeric"
                maxLength={16}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="(00) 00000-0000"
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Data de nascimento</label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder={notesPlaceholder}
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
                {isEducation && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Ações aluno</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredAndSorted.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="cursor-pointer hover:bg-neutral-50 transition-colors"
                >
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
                  {isEducation && (
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateStudentAccess(customer);
                          }}
                          disabled={!customer.email || accessLoadingId === customer.id}
                          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        >
                          Acesso
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateSubscription(customer);
                          }}
                          disabled={subscriptionLoadingId === customer.id}
                          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                          Mensalidade
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAndSorted.length === 0 && (
            <div className="p-8 text-center text-neutral-500">
              {search ? emptySearch : emptyList}
            </div>
          )}
        </div>
      </div>

      {selectedCustomer && business && (
        <CustomerDetailModal
          customer={selectedCustomer}
          businessId={business.id}
          onClose={() => setSelectedCustomer(null)}
          isClinic={isClinic}
          isEducation={isEducation}
        />
      )}
        </>
      )}
    </div>
  );
}

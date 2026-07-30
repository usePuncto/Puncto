'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Lead, LeadStatus, LeadType } from '@/types/leads';
import { getModuleById, PLAN_LABELS, type PlanId } from '@/content/modules';

const TYPE_LABELS: Record<string, string> = {
  contact: 'Contato',
  demo_request: 'Demo',
  newsletter: 'Newsletter',
  webinar: 'Webinar',
  module_interest: 'Módulos / Plano',
  enterprise: 'Enterprise',
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  won: 'Ganho',
  lost: 'Perdido',
  archived: 'Arquivado',
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

function typeBadgeClass(type: string): string {
  if (type === 'demo_request' || type === 'enterprise') return 'bg-purple-100 text-purple-800';
  if (type === 'module_interest') return 'bg-blue-100 text-blue-800';
  if (type === 'webinar') return 'bg-indigo-100 text-indigo-800';
  if (type === 'newsletter') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-800';
}

function statusBadgeClass(status: string): string {
  if (status === 'new') return 'bg-green-100 text-green-800';
  if (status === 'contacted') return 'bg-blue-100 text-blue-800';
  if (status === 'qualified') return 'bg-indigo-100 text-indigo-800';
  if (status === 'won') return 'bg-emerald-100 text-emerald-800';
  if (status === 'lost') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-600';
}

export default function PlatformContactsPage() {
  const { firebaseUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (firebaseUser) {
      fetchLeads();
    }
  }, [firebaseUser, filters, pagination.page]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/platform/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch leads');
      const data = await response.json();
      setLeads(data.leads);
      setPagination(data.pagination);
      setCounts(data.counts || {});
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const openLead = (lead: Lead) => {
    setSelected(lead);
    setNotes(lead.notes || '');
  };

  const updateLead = async (updates: { status?: LeadStatus; notes?: string }) => {
    if (!selected || !firebaseUser) return;
    setSaving(true);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/platform/leads/${selected.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update');
      const data = await response.json();
      setSelected({ ...selected, ...data });
      setLeads((prev) =>
        prev.map((l) => (l.id === selected.id ? { ...l, ...data } : l))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contatos</h1>
        <p className="mt-1 text-gray-600">
          Solicitações vindas do site de marketing (contato, demo, planos, newsletter e webinars).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'new', label: 'Novos' },
          { key: 'contact', label: 'Contato' },
          { key: 'demo_request', label: 'Demo' },
          { key: 'module_interest', label: 'Módulos' },
          { key: 'newsletter', label: 'Newsletter' },
          { key: 'webinar', label: 'Webinar' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (item.key === 'new') {
                setFilters({ ...filters, status: 'new', type: 'all' });
              } else if (item.key === 'all') {
                setFilters({ ...filters, type: 'all', status: 'all' });
              } else {
                setFilters({ ...filters, type: item.key, status: 'all' });
              }
              setPagination({ ...pagination, page: 1 });
            }}
            className="bg-white rounded-lg shadow px-3 py-3 text-left hover:bg-gray-50"
          >
            <div className="text-xs text-gray-500">{item.label}</div>
            <div className="text-xl font-semibold text-gray-900">
              {counts[item.key] ?? 0}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              placeholder="Nome, e-mail, empresa, assunto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => {
                setFilters({ ...filters, type: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Todos</option>
              {(Object.keys(TYPE_LABELS) as LeadType[]).map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Todos</option>
              {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
              <p className="mt-4 text-gray-600">Carregando contatos...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-gray-600">Nenhuma solicitação encontrada</div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contato
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => openLead(lead)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selected?.id === lead.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {lead.name || 'Sem nome'}
                        </div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                        {lead.company && (
                          <div className="text-xs text-gray-400">{lead.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${typeBadgeClass(lead.type)}`}
                        >
                          {TYPE_LABELS[lead.type] || lead.type}
                        </span>
                        {lead.plan && (
                          <div className="text-xs text-gray-500 mt-1">
                            {PLAN_LABELS[lead.plan as PlanId] || lead.plan}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadgeClass(lead.status)}`}
                        >
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(
                          typeof lead.createdAt === 'string' ? lead.createdAt : null
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagination.pages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t">
                  <div className="text-sm text-gray-700">
                    {pagination.total} solicitações
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pagination.page === 1}
                      onClick={() =>
                        setPagination({ ...pagination, page: pagination.page - 1 })
                      }
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() =>
                        setPagination({ ...pagination, page: pagination.page + 1 })
                      }
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Selecione uma solicitação para ver os detalhes
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 space-y-4 sticky top-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selected.name || 'Sem nome'}
                  </h2>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${typeBadgeClass(selected.type)}`}
                >
                  {TYPE_LABELS[selected.type] || selected.type}
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm">
                {selected.phone && (
                  <div>
                    <dt className="text-gray-500">Telefone</dt>
                    <dd className="font-medium text-gray-900">{selected.phone}</dd>
                  </div>
                )}
                {selected.company && (
                  <div>
                    <dt className="text-gray-500">Empresa</dt>
                    <dd className="font-medium text-gray-900">{selected.company}</dd>
                  </div>
                )}
                {selected.businessType && (
                  <div>
                    <dt className="text-gray-500">Tipo de negócio</dt>
                    <dd className="font-medium text-gray-900">{selected.businessType}</dd>
                  </div>
                )}
                {selected.industry && (
                  <div>
                    <dt className="text-gray-500">Segmento</dt>
                    <dd className="font-medium text-gray-900">{selected.industry}</dd>
                  </div>
                )}
                {selected.plan && (
                  <div>
                    <dt className="text-gray-500">Plano</dt>
                    <dd className="font-medium text-gray-900">
                      {PLAN_LABELS[selected.plan as PlanId] || selected.plan}
                      {selected.billing ? ` (${selected.billing === 'annual' ? 'anual' : 'mensal'})` : ''}
                    </dd>
                  </div>
                )}
                {selected.modules && selected.modules.length > 0 && (
                  <div>
                    <dt className="text-gray-500 mb-1">Módulos</dt>
                    <dd className="flex flex-wrap gap-1">
                      {selected.modules.map((id) => (
                        <span
                          key={id}
                          className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700"
                        >
                          {getModuleById(id)?.name || id}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {selected.subject && (
                  <div>
                    <dt className="text-gray-500">Assunto</dt>
                    <dd className="font-medium text-gray-900">{selected.subject}</dd>
                  </div>
                )}
                {selected.message && (
                  <div>
                    <dt className="text-gray-500">Mensagem</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 mt-1">
                      {selected.message}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Origem</dt>
                  <dd className="font-medium text-gray-900">
                    {selected.source?.page || '—'}
                    {selected.source?.referrer ? (
                      <span className="block text-xs text-gray-400 truncate">
                        ref: {selected.source.referrer}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Recebido em</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDate(typeof selected.createdAt === 'string' ? selected.createdAt : null)}
                  </dd>
                </div>
              </dl>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selected.status}
                  disabled={saving}
                  onChange={(e) =>
                    updateLead({ status: e.target.value as LeadStatus })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Anotações da equipe comercial..."
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updateLead({ notes })}
                  className="mt-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar notas'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Business } from '@/types/business';
import { getBusinessTypeLabel } from '@/lib/features/businessTypeFeatures';

interface BusinessListItem extends Partial<Business> {
  id: string;
}

function formatDate(dateOrTimestamp: any): string {
  if (!dateOrTimestamp) return '-';
  const date = dateOrTimestamp instanceof Date 
    ? dateOrTimestamp 
    : dateOrTimestamp?.toDate?.() || new Date(dateOrTimestamp);
  return date.toLocaleDateString('pt-BR');
}

export default function PlatformBusinessesPage() {
  const { firebaseUser } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    tier: '',
    industry: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.tier) params.append('tier', filters.tier);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/platform/businesses?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch businesses');
      }

      const data = await response.json();
      setBusinesses(data.businesses);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firebaseUser) {
      fetchBusinesses();
    }
  }, [firebaseUser, filters, pagination.page]);

  const handleSuspend = async (businessId: string, suspend: boolean) => {
    try {
      const token = await firebaseUser?.getIdToken();
      const response = await fetch(`/api/platform/businesses/${businessId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            status: suspend ? 'suspended' : 'active',
          },
        }),
      });

      if (response.ok) {
        fetchBusinesses();
      }
    } catch (error) {
      console.error('Error updating business:', error);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Negócios</h1>
        <Link
          href="/platform/businesses/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Criar Negócio
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Todos</option>
              <option value="active">Ativo</option>
              <option value="suspended">Suspenso</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plano
            </label>
            <select
              value={filters.tier}
              onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todos</option>
              <option value="free">Grátis</option>
              <option value="basic">Básico</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Segmento
            </label>
            <select
              value={filters.industry}
              onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todos</option>
              <option value="salon">Salão</option>
              <option value="clinic">Clínica</option>
              <option value="restaurant">Restaurante</option>
              <option value="bakery">Padaria</option>
              <option value="event">Eventos</option>
              <option value="general">Geral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Nome, e-mail, slug..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Business List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando negócios...</p>
        </div>
      ) : businesses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Nenhum negócio encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Negócio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segmento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {businesses.map((business) => (
                <tr key={business.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <Link
                        href={`/platform/businesses/${business.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {business.displayName}
                      </Link>
                      <p className="text-sm text-gray-500">{business.email}</p>
                      <p className="text-xs text-gray-400">{business.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getBusinessTypeLabel(business.industry || 'general')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      business.subscription?.tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                      business.subscription?.tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                      business.subscription?.tier === 'basic' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {business.subscription?.tier === 'enterprise' ? 'Enterprise' : business.subscription?.tier === 'pro' ? 'Pro' : business.subscription?.tier === 'basic' ? 'Básico' : 'Grátis'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      business.subscription?.status === 'active' ? 'bg-green-100 text-green-800' :
                      business.subscription?.status === 'suspended' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {business.subscription?.status === 'active' ? 'Ativo' : business.subscription?.status === 'suspended' ? 'Suspenso' : 'Desconhecido'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(business.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/platform/businesses/${business.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver
                      </Link>
                      {business.subscription?.status === 'active' ? (
                        <button
                          onClick={() => handleSuspend(business.id, true)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Suspender
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(business.id, false)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Ativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Exibindo {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} negócios
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

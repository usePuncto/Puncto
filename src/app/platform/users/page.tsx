'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  platformAdmin?: boolean;
  userType?: string;
  businessRoles?: Record<string, 'owner' | 'manager' | 'professional'>;
  businesses?: Array<{ id: string; role: string; displayName?: string | null }>;
  createdAt?: string;
  lastAccessAt?: string | null;
  accountStatus?: 'active' | 'pending_first_login';
  canResendInvite?: boolean;
}

function roleLabel(role: string): string {
  if (role === 'owner') return 'Proprietário';
  if (role === 'manager') return 'Gerente';
  if (role === 'professional') return 'Profissional';
  if (role === 'customer') return 'Cliente';
  return role;
}

function userRoleLabels(user: User): string[] {
  if (user.businesses && user.businesses.length > 0) {
    return Array.from(new Set(user.businesses.map((b) => b.role)));
  }
  if (user.businessRoles && Object.keys(user.businessRoles).length > 0) {
    return Array.from(new Set(Object.values(user.businessRoles)));
  }
  if (user.userType === 'student' || user.userType === 'customer') {
    return ['customer'];
  }
  return [];
}

function accountStatusLabel(status?: User['accountStatus']): string {
  if (status === 'active') return 'Conta ativa';
  if (status === 'pending_first_login') return 'Aguardando 1º acesso';
  return 'Desconhecido';
}

function accountStatusClass(status?: User['accountStatus']): string {
  if (status === 'active') return 'bg-green-100 text-green-800';
  if (status === 'pending_first_login') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-800';
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return 'Nunca acessou';
  return new Date(iso).toLocaleString('pt-BR');
}

export default function PlatformUsersPage() {
  const { firebaseUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<{ userId: string; text: string } | null>(null);
  const [filters, setFilters] = useState({
    businessId: '',
    role: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    if (firebaseUser) {
      fetchUsers();
    }
  }, [firebaseUser, filters, pagination.page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (filters.businessId) params.append('businessId', filters.businessId);
      if (filters.role) params.append('role', filters.role);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/platform/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (user: User) => {
    if (!firebaseUser || !user.canResendInvite) return;
    setResendingId(user.id);
    setResendMessage(null);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/platform/users/resend-invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao reenviar convite');
      setResendMessage({ userId: user.id, text: data.message || 'Convite reenviado.' });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao reenviar convite');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="E-mail, nome..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Função
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todos</option>
              <option value="owner">Proprietário</option>
              <option value="manager">Gerente</option>
              <option value="professional">Profissional</option>
              <option value="customer">Cliente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID do Negócio (opcional)
            </label>
            <input
              type="text"
              value={filters.businessId}
              onChange={(e) => setFilters({ ...filters, businessId: e.target.value })}
              placeholder="Filtrar por negócio..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* User List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Função
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Negócios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último acesso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName || user.name || 'Sem nome'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.platformAdmin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                          Admin da Plataforma
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {userRoleLabels(user).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {userRoleLabels(user).map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              role === 'owner' ? 'bg-blue-100 text-blue-800' :
                              role === 'manager' ? 'bg-green-100 text-green-800' :
                              role === 'customer' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {roleLabel(role)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Sem função em negócio</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {user.businesses && user.businesses.length > 0 ? (
                        <div className="space-y-1">
                          {user.businesses.slice(0, 3).map((business) => (
                            <div key={business.id} className="flex items-center space-x-2">
                              <Link
                                href={`/platform/businesses/${business.id}`}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                title={business.id}
                              >
                                {business.displayName || business.id}
                              </Link>
                              <span className="text-xs text-gray-500">({roleLabel(business.role)})</span>
                            </div>
                          ))}
                          {user.businesses.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{user.businesses.length - 3} mais
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Nenhum negócio</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${accountStatusClass(user.accountStatus)}`}
                    >
                      {accountStatusLabel(user.accountStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(user.lastAccessAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.canResendInvite ? (
                      <button
                        onClick={() => handleResendInvite(user)}
                        disabled={resendingId === user.id}
                        className="rounded border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {resendingId === user.id ? 'Enviando...' : 'Reenviar convite'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {resendMessage?.userId === user.id && (
                      <p className="mt-1 text-xs text-green-600">{resendMessage.text}</p>
                    )}
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
                {pagination.total} usuários
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

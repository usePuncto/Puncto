'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getBusinessTypeLabel } from '@/lib/features/businessTypeFeatures';

interface BusinessSubscription {
  id: string;
  displayName: string;
  slug: string;
  email: string;
  industry: string;
  subscription: {
    tier: string;
    status: string;
    billingEmail?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
  };
}

const tierLabels: Record<string, string> = {
  free: 'Grátis',
  basic: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  past_due: 'Pagamento em atraso',
  canceled: 'Cancelado',
};

function formatDate(val: unknown): string {
  if (!val) return '-';
  let d: Date;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'object' && val !== null && '_seconds' in val) {
    d = new Date((val as { _seconds: number })._seconds * 1000);
  } else if (typeof val === 'string') {
    d = new Date(val);
  } else {
    d = new Date(String(val));
  }
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}

export default function PlatformBillingPage() {
  const { firebaseUser } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (firebaseUser) {
      fetchBusinesses();
    }
  }, [firebaseUser]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      const res = await fetch('/api/platform/businesses?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = businesses.filter((b) => {
    if (tierFilter && (b.subscription?.tier || 'free') !== tierFilter) return false;
    if (statusFilter && (b.subscription?.status || 'active') !== statusFilter) return false;
    return true;
  });

  const tierCounts = businesses.reduce((acc, b) => {
    const t = b.subscription?.tier || 'free';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = businesses.filter((b) => (b.subscription?.status || 'active') === 'active').length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        <p className="mt-4 text-gray-600">Carregando assinaturas...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Faturamento e Assinaturas</h1>
        <Link
          href="/platform/businesses"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Ver todos os negócios
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total de negócios</p>
          <p className="text-2xl font-bold text-gray-900">{businesses.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Assinaturas ativas</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Por plano</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(tierCounts).map(([tier, count]) => (
              <span key={tier} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                {tierLabels[tier] || tier}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Todos</option>
            <option value="free">Grátis</option>
            <option value="basic">Básico</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Todos</option>
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
            <option value="past_due">Pagamento em atraso</option>
            <option value="canceled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Lista de assinaturas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Negócio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período atual</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Nenhuma assinatura encontrada
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/platform/businesses/${b.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                      {b.displayName}
                    </Link>
                    <p className="text-sm text-gray-500">{b.email}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {getBusinessTypeLabel(b.industry || 'general')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      b.subscription?.tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                      b.subscription?.tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                      b.subscription?.tier === 'basic' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {tierLabels[b.subscription?.tier || 'free'] || b.subscription?.tier || 'Grátis'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      (b.subscription?.status || 'active') === 'active' ? 'bg-green-100 text-green-800' :
                      (b.subscription?.status || '') === 'suspended' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {statusLabels[b.subscription?.status || 'active'] || b.subscription?.status || 'Ativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(b.subscription?.currentPeriodStart)} – {formatDate(b.subscription?.currentPeriodEnd)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link href={`/platform/businesses/${b.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

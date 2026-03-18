'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Business } from '@/types/business';
import { getBusinessTypeLabel } from '@/lib/features/businessTypeFeatures';

function formatDate(dateOrTimestamp: any): string {
  if (!dateOrTimestamp) return 'N/A';
  const date = dateOrTimestamp instanceof Date 
    ? dateOrTimestamp 
    : dateOrTimestamp?.toDate?.() || new Date(dateOrTimestamp);
  return date.toLocaleDateString('pt-BR');
}

export default function PlatformBusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const businessId = params.id as string;
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseUser && businessId) {
      fetchBusiness();
    }
  }, [firebaseUser, businessId]);

  const fetchBusiness = async () => {
    setLoading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      const response = await fetch(`/api/platform/businesses/${businessId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch business');
      }

      const data = await response.json();
      setBusiness(data.business);
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        <p className="mt-4 text-gray-600">Carregando negócio...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-600">Negócio não encontrado</p>
        <Link href="/platform/businesses" className="text-blue-600 hover:underline mt-4 inline-block">
          Voltar aos Negócios
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/platform/businesses"
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Voltar aos Negócios
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{business.displayName}</h1>
        </div>
        <Link
          href={`/platform/businesses/${businessId}/edit`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Editar Negócio
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Informações Básicas</h2>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nome de exibição</dt>
                <dd className="mt-1 text-sm text-gray-900">{business.displayName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Razão social</dt>
                <dd className="mt-1 text-sm text-gray-900">{business.legalName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Identificador (slug)</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`https://${business.slug}.puncto.com.br`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {business.slug}.puncto.com.br
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">E-mail</dt>
                <dd className="mt-1 text-sm text-gray-900">{business.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="mt-1 text-sm text-gray-900">{business.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Segmento</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getBusinessTypeLabel(business.industry)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Subscription */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Assinatura</h2>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Plano</dt>
                <dd className="mt-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    (business.subscription?.tier || 'free') === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                    (business.subscription?.tier || '') === 'pro' ? 'bg-blue-100 text-blue-800' :
                    (business.subscription?.tier || '') === 'basic' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {
                      business.subscription?.tier === 'enterprise'
                        ? 'Enterprise'
                        : business.subscription?.tier === 'pro'
                          ? 'Pro'
                          : business.subscription?.tier === 'basic'
                            ? 'Básico'
                            : 'Grátis'
                    }
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    (business.subscription?.status || 'active') === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(business.subscription?.status || 'active') === 'active' ? 'Ativo' : 'Suspenso'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Período atual</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(business.subscription?.currentPeriodStart)} -{' '}
                  {formatDate(business.subscription?.currentPeriodEnd)}
                </dd>
              </div>
              {business.subscription?.stripeCustomerId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">ID do cliente Stripe</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {business.subscription?.stripeCustomerId}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Resumo</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Criado em</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(business.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Última atualização</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(business.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Ações</h2>
            <div className="space-y-2">
              <Link
                href={`https://${business.slug}.puncto.com.br`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 text-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Ver site público
              </Link>
              <Link
                href={`https://${business.slug}.gestao.puncto.com.br`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 text-center bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                Ver painel administrativo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useCustomers } from '@/lib/queries/customers';
import { useServices } from '@/lib/queries/services';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { NotificationsPreview } from '@/components/notifications/NotificationsPreview';

export default function AdminDashboardPage() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const t = useTranslations('dashboard');
  const { data: customers = [], isLoading: customersLoading } = useCustomers(business?.id ?? '');
  const { data: services = [], isLoading: servicesLoading } = useServices(business?.id ?? '');

  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [purchasesCount, setPurchasesCount] = useState<number | null>(null);

  useEffect(() => {
    if (!business?.id) return;
    Promise.all([
      fetch(`/api/inventory?businessId=${business.id}`).then((r) => r.json()).then((d) => d.items?.length ?? 0).catch(() => null),
      fetch(`/api/purchases?businessId=${business.id}`).then((r) => r.json()).then((d) => d.purchaseOrders?.length ?? 0).catch(() => null),
    ]).then(([inv, purch]) => {
      setInventoryCount(inv);
      setPurchasesCount(purch);
    });
  }, [business?.id]);

  const isLoading = customersLoading || servicesLoading;

  if (isLoading && customers.length === 0 && services.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Clientes', value: customers.length, href: '/tenant/admin/customers', icon: '👤' },
    { label: 'Serviços', value: services.length, href: '/tenant/admin/services', icon: '🏥' },
    { label: 'Itens no estoque', value: inventoryCount ?? '—', href: '/tenant/admin/inventory', icon: '📦' },
    { label: 'Ordens de compra', value: purchasesCount ?? '—', href: '/tenant/admin/purchases', icon: '🛒' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-600 mt-2">{t('overview')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-neutral-600">{stat.label}</p>
                <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Visão geral</h2>
        <p className="text-sm text-neutral-600">
          Use o menu à esquerda para acessar agendamentos, pagamentos, cardápio e outras áreas do seu negócio.
        </p>
      </div>

      {business?.id && user?.id && (
        <div className="mt-6">
          <NotificationsPreview
            businessId={business.id}
            recipientUserId={user.id}
            href="/tenant/admin/notifications"
            limit={5}
          />
        </div>
      )}
    </div>
  );
}

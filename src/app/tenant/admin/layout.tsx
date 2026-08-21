'use client';

import { ReactNode, useMemo, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LocaleSwitcher } from '@/components/admin/LocaleSwitcher';
import { useTranslations } from 'next-intl';
import {
  canAccessAdminCapability,
  canAccessAdminPath,
  type AdminNavCapability,
} from '@/lib/features/moduleAccess';
import { getBusinessRole } from '@/lib/permissions';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';
import { isSubscriptionAccessBlocked } from '@/lib/business/subscription-access';
import { signOutAndClearSession } from '@/lib/business/check-subscription-client';

interface AdminLayoutProps {
  children: ReactNode;
}

type NavItem = {
  href: string;
  key: string;
  icon: string;
  capability: AdminNavCapability;
};

/** Default nav (most industries) — gated per business via enabledModules */
const adminNavItems: NavItem[] = [
  { href: '/tenant/admin/dashboard', key: 'dashboard', icon: '📊', capability: { always: true } },
  { href: '/tenant/admin/notifications', key: 'notifications', icon: '🔔', capability: { always: true } },
  {
    href: '/tenant/admin/bookings',
    key: 'bookings',
    icon: '📅',
    capability: {
      modules: ['agendamento_online', 'agendamento_reunioes'],
      feature: 'scheduling',
    },
  },
  {
    href: '/tenant/admin/services',
    key: 'services',
    icon: '🏥',
    capability: { modules: ['agendamento_online', 'pacote_servicos'], feature: 'scheduling' },
  },
  {
    href: '/tenant/admin/professionals',
    key: 'professionals',
    icon: '👥',
    capability: { modules: ['equipes', 'agendamento_online'], feature: 'scheduling' },
  },
  {
    href: '/tenant/admin/customers',
    key: 'customers',
    icon: '👤',
    capability: { modules: ['cadastro_clientes'], feature: 'crm' },
  },
  {
    href: '/tenant/admin/appointment-reminders',
    key: 'appointmentReminders',
    icon: '📩',
    capability: { modules: ['lembrete_agendamento'] },
  },
  {
    href: '/tenant/admin/waitlist',
    key: 'waitlist',
    icon: '⏳',
    capability: { modules: ['lista_espera'] },
  },
  {
    href: '/tenant/admin/prescriptions',
    key: 'prescriptions',
    icon: '💊',
    capability: { modules: ['prescricao_eletronica'] },
  },
  {
    href: '/tenant/admin/e-signatures',
    key: 'eSignatures',
    icon: '✍️',
    capability: { modules: ['assinatura_eletronica'] },
  },
  {
    href: '/tenant/admin/payments',
    key: 'payments',
    icon: '💳',
    capability: { modules: ['pagamentos'], feature: 'payments' },
  },
  {
    href: '/tenant/admin/financial',
    key: 'financial',
    icon: '💰',
    capability: { modules: ['relatorio_financeiro'], feature: 'analytics' },
  },
  {
    href: '/tenant/admin/menu',
    key: 'menu',
    icon: '🍽️',
    capability: { modules: ['vitrine_digital'], feature: 'restaurantMenu' },
  },
  {
    href: '/tenant/admin/orders',
    key: 'orders',
    icon: '📋',
    capability: { feature: 'tableOrdering' },
  },
  {
    href: '/tenant/admin/tables',
    key: 'tables',
    icon: '🪑',
    capability: { feature: 'virtualTabs' },
  },
  {
    href: '/tenant/admin/inventory',
    key: 'inventory',
    icon: '📦',
    capability: { modules: ['controle_estoque'], feature: 'inventoryManagement' },
  },
  {
    href: '/tenant/admin/purchases',
    key: 'purchases',
    icon: '🛒',
    capability: { modules: ['fornecedores_compras'], feature: 'purchaseOrders' },
  },
  {
    href: '/tenant/admin/time-clock',
    key: 'timeClock',
    icon: '⏰',
    capability: { modules: ['ponto_eletronico'], feature: 'timeClock' },
  },
  {
    href: '/tenant/admin/fiscal-notes',
    key: 'fiscalNotes',
    icon: '🧾',
    capability: { modules: ['emissao_nf'] },
  },
  {
    href: '/tenant/admin/loyalty',
    key: 'loyalty',
    icon: '🎁',
    capability: {
      modules: ['programa_fidelidade', 'cupons_desconto'],
      feature: 'loyaltyPrograms',
    },
  },
  {
    href: '/tenant/admin/whatsapp',
    key: 'whatsapp',
    icon: '💬',
    capability: { modules: ['whatsapp_automatico'] },
  },
  {
    href: '/tenant/admin/franchise',
    key: 'franchise',
    icon: '🏢',
    capability: { enterprise: true },
  },
  { href: '/tenant/admin/settings', key: 'settings', icon: '⚙️', capability: { always: true } },
];

/** Education: school-oriented labels and routes */
const educationAdminNavItems: NavItem[] = [
  { href: '/tenant/admin/dashboard', key: 'dashboard', icon: '📊', capability: { always: true } },
  { href: '/tenant/admin/notifications', key: 'notifications', icon: '🔔', capability: { always: true } },
  {
    href: '/tenant/admin/bookings',
    key: 'preEnrollments',
    icon: '📅',
    capability: { modules: ['agendamento_aulas', 'cadastro_alunos'], feature: 'scheduling' },
  },
  {
    href: '/tenant/admin/eventos',
    key: 'events',
    icon: '🎉',
    capability: { modules: ['coleta_eventos'] },
  },
  {
    href: '/tenant/admin/professionals',
    key: 'professionals',
    icon: '👥',
    capability: { modules: ['equipes', 'agendamento_aulas'], feature: 'scheduling' },
  },
  {
    href: '/tenant/admin/customers',
    key: 'students',
    icon: '👤',
    capability: { modules: ['cadastro_alunos'], feature: 'crm' },
  },
  {
    href: '/tenant/admin/aulas-experimentais',
    key: 'experimentalLessons',
    icon: '🧪',
    capability: { modules: ['agendamento_aulas'], feature: 'scheduling' },
  },
  {
    href: '/tenant/admin/turmas',
    key: 'turmas',
    icon: '🎓',
    capability: { modules: ['gestao_turmas'] },
  },
  {
    href: '/tenant/admin/attendance',
    key: 'rollCall',
    icon: '📝',
    capability: { modules: ['lista_presenca'] },
  },
  {
    href: '/tenant/admin/payments',
    key: 'payments',
    icon: '💳',
    capability: { modules: ['pagamentos_mensalidades'], feature: 'payments' },
  },
  {
    href: '/tenant/admin/financial',
    key: 'financial',
    icon: '💰',
    capability: { modules: ['relatorio_financeiro'], feature: 'analytics' },
  },
  {
    href: '/tenant/admin/fiscal-notes',
    key: 'fiscalNotes',
    icon: '🧾',
    capability: { modules: ['emissao_nf'] },
  },
  {
    href: '/tenant/admin/loyalty',
    key: 'loyalty',
    icon: '🎁',
    capability: { feature: 'loyaltyPrograms' },
  },
  {
    href: '/tenant/admin/whatsapp',
    key: 'whatsapp',
    icon: '💬',
    capability: { modules: ['whatsapp_automatico'] },
  },
  { href: '/tenant/admin/settings', key: 'settings', icon: '⚙️', capability: { always: true } },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { business } = useBusiness();
  const { user, logout } = useAuth();
  const t = useTranslations('nav');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const role = user && business ? getBusinessRole(user, business.id) : null;

  useEffect(() => {
    if (role === 'professional') {
      router.replace('/tenant/professional');
    }
  }, [role, router]);

  useEffect(() => {
    if (!business || !isSubscriptionAccessBlocked(business.subscription?.status)) return;
    const params = new URLSearchParams({ subscriptionEnded: '1' });
    if (business.slug) params.set('subdomain', business.slug);
    params.set('app', 'gestao');
    void signOutAndClearSession().then(() => {
      window.location.href = `/auth/login?${params.toString()}`;
    });
  }, [business?.id, business?.subscription?.status, business?.slug]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const visibleNavItems = useMemo(() => {
    if (!business) return [];
    const items = business.industry === 'education' ? educationAdminNavItems : adminNavItems;
    return items.filter((item) => canAccessAdminCapability(business, item.capability));
  }, [
    business,
    business?.id,
    business?.industry,
    business?.enabledModules,
    business?.features,
    business?.subscription?.tier,
    business?.subscription?.planId,
  ]);

  // Block deep-links to modules disabled for this business
  useEffect(() => {
    if (!business || !pathname) return;
    if (!canAccessAdminPath(business, pathname)) {
      router.replace('/tenant/admin/dashboard');
    }
  }, [business, pathname, router]);

  const getNavLabel = (item: NavItem) => {
    if (item.key === 'customers' && business?.industry === 'clinic') return t('patients');
    if (item.key === 'professionals' && business?.industry === 'education') return t('teachers');
    return t(item.key);
  };

  return (
    <ProtectedRoute allowedRoles={['owner', 'manager', 'professional']}>
      <div className="min-h-screen bg-neutral-50">
        {/* Mobile top bar + drawer */}
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white px-4 py-3 lg:hidden print:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700"
              aria-label="Abrir menu"
            >
              ☰ Menu
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate text-sm font-semibold text-neutral-900">{business?.displayName || 'Admin'}</p>
              <p className="truncate text-xs text-neutral-600">{t('adminPanel')}</p>
            </div>
            {business?.id && user?.id ? (
              <NotificationsBell
                businessId={business.id}
                recipientUserId={user.id}
                href="/tenant/admin/notifications"
              />
            ) : (
              <div className="w-8" />
            )}
          </div>
        </header>

        {isMobileMenuOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed left-0 top-0 z-50 h-full w-[85%] max-w-xs border-r border-neutral-200 bg-white transition-transform duration-200 ease-out lg:hidden print:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-neutral-900">{business?.displayName || 'Admin'}</h2>
                  <p className="mt-1 text-xs text-neutral-600">{t('adminPanel')}</p>
                  {business?.id && (
                    <p className="mt-1 truncate font-mono text-[10px] text-neutral-400" title={business.id}>
                      ID: {business.id}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700"
                  aria-label="Fechar menu"
                >
                  ✕
                </button>
              </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{getNavLabel(item)}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-neutral-200 p-4">
              <p className="truncate text-sm font-medium text-neutral-900">{user?.displayName || user?.email}</p>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {t('logout')}
                </button>
                <LocaleSwitcher />
              </div>
            </div>
          </div>
        </aside>

        {/* Sidebar (hidden when printing) */}
        <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-neutral-200 bg-white print:hidden lg:flex">
          <div className="flex-shrink-0 p-4 border-b border-neutral-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold truncate">{business?.displayName || 'Admin'}</h1>
                <p className="text-sm text-neutral-600 mt-1">{t('adminPanel')}</p>
                {business?.id && (
                  <p className="mt-1 truncate font-mono text-[10px] text-neutral-400" title={business.id}>
                    ID: {business.id}
                  </p>
                )}
              </div>

              {business?.id && user?.id && (
                <NotificationsBell
                  businessId={business.id}
                  recipientUserId={user.id}
                  href="/tenant/admin/notifications"
                />
              )}
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto p-4 space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{getNavLabel(item)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex-shrink-0 p-4 border-t border-neutral-200">
            <div className="text-sm">
              <p className="font-medium">{user?.displayName || user?.email}</p>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-blue-600 hover:underline text-xs text-left"
                >
                  {t('logout')}
                </button>
                <LocaleSwitcher />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content (full-width when printing) */}
        <main className="min-h-screen lg:ml-64 print:ml-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

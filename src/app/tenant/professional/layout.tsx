'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { ProfessionalProvider, useProfessional } from '@/lib/contexts/ProfessionalContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getBusinessRole } from '@/lib/permissions';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';

function ProfessionalLayoutInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const { business } = useBusiness();
  const { professional, isLoading } = useProfessional();

  const role = user && business ? getBusinessRole(user, business.id) : null;
  const isProfessional = role === 'professional';
  const professionalId = (user?.customClaims as { professionalId?: string })?.professionalId;

  useEffect(() => {
    if (loading || isLoading) return;
    // Owners/managers can access professional dashboard (they have owner professional).
    // Pure professionals need professionalId (invite); redirect if missing.
    if (role === 'professional' && !professionalId && !professional) {
      router.replace('/tenant/admin/dashboard');
    }
  }, [loading, isLoading, role, professionalId, professional, router]);

  const isEducation = business?.industry === 'education';
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  const navItems = isEducation
    ? [
        { href: '/tenant/professional', label: 'Calendário', icon: '📅' },
        { href: '/tenant/professional/attendance', label: 'Lista de chamada', icon: '📝' },
        { href: '/tenant/professional/turmas', label: 'Minhas turmas', icon: '🎓' },
        { href: '/tenant/professional/notifications', label: 'Notificações', icon: '🔔' },
        { href: '/tenant/professional/clients', label: 'Alunos', icon: '👤' },
      ]
    : [
        { href: '/tenant/professional', label: 'Agenda', icon: '📅' },
        { href: '/tenant/professional/bookings', label: 'Agendamentos', icon: '📋' },
        { href: '/tenant/professional/notifications', label: 'Notificações', icon: '🔔' },
        { href: '/tenant/professional/clients', label: 'Clientes', icon: '👤' },
        { href: '/tenant/professional/services', label: 'Serviços', icon: '✂️' },
        { href: '/tenant/professional/working-hours', label: 'Meus horários', icon: '🕐' },
      ];

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">{business?.displayName}</p>
            <p className="text-xs text-neutral-600">
              {isEducation ? 'Área do professor' : 'Área do profissional'}
            </p>
          </div>
          <div className="ml-3 flex items-center gap-2">
            {business?.id && user?.id && (
              <NotificationsBell
                businessId={business.id}
                recipientUserId={user.id}
                href="/tenant/professional/notifications"
              />
            )}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-700"
              aria-label="Abrir menu"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      {isMobileNavOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-neutral-200 bg-white transition-transform duration-200 lg:hidden ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{business?.displayName}</h1>
            <p className="text-sm text-neutral-600">
              {isEducation ? 'Área do professor' : 'Área do profissional'}
            </p>
            {professional && (
              <p className="mt-1 truncate text-sm font-medium text-neutral-800">{professional.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700"
            aria-label="Fechar menu"
          >
            X
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/tenant/professional' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileNavOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-neutral-200 p-4">
          {!isProfessional && (
            <Link
              href="/tenant/admin/dashboard"
              onClick={() => setIsMobileNavOpen(false)}
              className="block text-sm text-neutral-600 hover:text-neutral-900"
            >
              ← Voltar ao painel admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Sair
          </button>
        </div>
      </aside>

      <aside className="fixed left-0 top-0 hidden h-full w-56 flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="flex-shrink-0 p-4 border-b border-neutral-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">{business?.displayName}</h1>
              <p className="text-sm text-neutral-600">
                {isEducation ? 'Área do professor' : 'Área do profissional'}
              </p>
            </div>
            {business?.id && user?.id && (
              <NotificationsBell
                businessId={business.id}
                recipientUserId={user.id}
                href="/tenant/professional/notifications"
              />
            )}
          </div>
          {professional && (
            <p className="mt-1 text-sm font-medium text-neutral-800">{professional.name}</p>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/tenant/professional' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-shrink-0 p-4 border-t border-neutral-200 space-y-2">
          {!isProfessional && (
            <Link
              href="/tenant/admin/dashboard"
              className="block text-sm text-neutral-600 hover:text-neutral-900"
            >
              ← Voltar ao painel admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="min-h-screen p-4 sm:p-6 lg:ml-56 lg:p-8">{children}</main>
    </div>
  );
}

export default function ProfessionalLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute
      allowedRoles={['owner', 'manager', 'professional']}
      redirectTo="/auth/login"
    >
      <ProfessionalProvider>
        <ProfessionalLayoutInner>{children}</ProfessionalLayoutInner>
      </ProfessionalProvider>
    </ProtectedRoute>
  );
}

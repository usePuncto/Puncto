'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { business } = useBusiness();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.type !== 'student') {
      router.replace(`/auth/student/login?returnUrl=${encodeURIComponent(pathname || '/tenant/student')}`);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user || user.type !== 'student' || business.industry !== 'education') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  const nav = [
    { href: '/tenant/student', label: 'Resumo' },
    { href: '/tenant/student/turmas', label: 'Minhas turmas' },
    { href: '/tenant/student/faltas', label: 'Faltas' },
    { href: '/tenant/student/financeiro', label: 'Financeiro' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <aside className="fixed left-0 top-0 h-full w-60 border-r border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-neutral-900">{business.displayName}</h2>
        <p className="text-sm text-neutral-500">Portal do aluno</p>
        <nav className="mt-6 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm ${active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-8 text-sm text-neutral-600 hover:text-neutral-900"
        >
          Sair
        </button>
      </aside>
      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}

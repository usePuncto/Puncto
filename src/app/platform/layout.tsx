'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

/**
 * Platform Admin Layout
 * 
 * This layout is used for admin.puncto.com.br
 * Only platform administrators can access these routes
 */
export default function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ProtectedRoute requirePlatformAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Puncto – Painel da Plataforma
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/platform/dashboard"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname === '/platform/dashboard'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/platform/businesses"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname?.startsWith('/platform/businesses')
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Negócios
                </Link>
                <Link
                  href="/platform/users"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname?.startsWith('/platform/users')
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Usuários
                </Link>
                <Link
                  href="/platform/billing"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname?.startsWith('/platform/billing')
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Faturamento
                </Link>
                <Link
                  href="/platform/whatsapp"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname?.startsWith('/platform/whatsapp')
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  WhatsApp
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

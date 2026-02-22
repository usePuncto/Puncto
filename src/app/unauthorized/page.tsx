'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const { user, logout } = useAuth();

  const getMessage = () => {
    switch (reason) {
      case 'platform_admin_required':
        return {
          title: 'Acesso Restrito - Administradores Apenas',
          description:
            'Esta área é restrita aos administradores da plataforma Puncto. Se você acredita que deveria ter acesso, entre em contato com o suporte.',
          suggestion: 'Você está logado como usuário de negócio ou cliente.',
        };
      case 'business_admin_required':
        return {
          title: 'Acesso Negado',
          description:
            'Você não tem permissão para acessar a área administrativa deste negócio. Apenas proprietários, gerentes e profissionais autorizados podem acessar.',
          suggestion: 'Faça login com uma conta que tenha permissões administrativas.',
        };
      default:
        return {
          title: 'Acesso Não Autorizado',
          description:
            'Você não tem permissão para acessar esta página. Verifique se está usando a conta correta.',
          suggestion: 'Tente fazer login novamente ou entre em contato com o suporte.',
        };
    }
  };

  const message = getMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Error Icon */}
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>

          {/* Title */}
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {message.title}
          </h2>

          {/* Description */}
          <p className="mt-2 text-sm text-gray-600">{message.description}</p>

          {/* Current User Info */}
          {user && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Conta atual:</strong> {user.email}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Tipo: {user.type === 'platform_admin' ? 'Admin Plataforma' : user.type === 'business_user' ? 'Usuário de Negócio' : 'Cliente'}
              </p>
            </div>
          )}

          {/* Suggestion */}
          <p className="mt-4 text-sm text-gray-500">{message.suggestion}</p>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          {user && (
            <button
              onClick={() => logout()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Fazer Logout e Trocar de Conta
            </button>
          )}

          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Voltar para Página Inicial
          </Link>

          <Link
            href="/contact"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Entrar em Contato com Suporte
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Se você continuar tendo problemas, entre em contato com{' '}
            <a href="mailto:suporte@puncto.com.br" className="text-indigo-600 hover:text-indigo-500">
              suporte@puncto.com.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

import './globals.css';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import ptBR from '@/messages/pt-BR.json';

export const metadata = {
  title: 'Puncto - Agendamentos',
  description: 'Plataforma de agendamentos para clínicas, salões e estabelecimentos',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Puncto',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ignoreAuth = headers().get('x-ignore-auth') === 'true';

  return (
    <html lang="pt-BR">
      <body>
        <NextIntlClientProvider locale="pt-BR" messages={ptBR}>
          <QueryProvider>
            <AuthProvider ignoreAuth={ignoreAuth}>
              {children}
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
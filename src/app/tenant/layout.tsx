import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentBusiness, serializeBusinessForClient } from '@/lib/tenant';
import { BusinessProvider } from '@/lib/contexts/BusinessContext';
import { BrandingWrapper } from '@/components/branding/BrandingWrapper';

export async function generateMetadata(): Promise<Metadata> {
  const business = await getCurrentBusiness();
  if (!business) return { title: 'Puncto' };
  return {
    title: `${business.displayName} | Agendamento`,
    ...(business.branding?.faviconUrl && {
      icons: { icon: business.branding.faviconUrl },
    }),
  };
}

export default async function TenantLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Fetch business based on subdomain
  const business = await getCurrentBusiness();

  if (!business) {
    // Business not found - show 404
    console.log('[TenantLayout] business not found, calling notFound() -> 404');
    notFound();
  }

  // Check if business is active
  if (business.subscription.status === 'suspended' || business.subscription.status === 'cancelled') {
    // Note: Using hardcoded strings here for now as this is a server component
    // In a production app, you'd use getServerTranslations here
    const suspendedMessages: Record<string, { title: string; message: string }> = {
      'pt-BR': {
        title: 'Conta Suspensa',
        message: 'Esta conta está atualmente suspensa. Entre em contato com o suporte para mais informações.',
      },
      'en-US': {
        title: 'Suspended Account',
        message: 'This account is currently suspended. Please contact support for more information.',
      },
      'es-ES': {
        title: 'Cuenta Suspendida',
        message: 'Esta cuenta está actualmente suspendida. Por favor, contacte con soporte para más información.',
      },
    };
    const locale = business.settings?.locale || 'pt-BR';
    const messages = suspendedMessages[locale] || suspendedMessages['pt-BR'];

    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="rounded-2xl bg-white p-8 shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-semibold text-neutral-900">{messages.title}</h1>
          <p className="mt-4 text-neutral-600">{messages.message}</p>
        </div>
      </div>
    );
  }

  // Serialize for Client Components (Firestore Timestamps are not plain objects)
  const serialized = serializeBusinessForClient(business);

  return (
    <BusinessProvider business={serialized}>
      <BrandingWrapper branding={serialized.branding}>
        {children}
      </BrandingWrapper>
    </BusinessProvider>
  );
}

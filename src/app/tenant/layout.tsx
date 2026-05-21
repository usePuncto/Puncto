import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentBusiness, serializeBusinessForClient } from '@/lib/tenant';
import { BusinessProvider } from '@/lib/contexts/BusinessContext';
import { BrandingWrapper } from '@/components/branding/BrandingWrapper';
import {
  isSubscriptionAccessBlocked,
  SUBSCRIPTION_ENDED_MESSAGE,
  SUBSCRIPTION_ENDED_TITLE,
  SUBSCRIPTION_ENDED_SUPPORT_HINT,
} from '@/lib/business/subscription-access';

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
  if (isSubscriptionAccessBlocked(business.subscription?.status)) {
    // Note: Using hardcoded strings here for now as this is a server component
    // In a production app, you'd use getServerTranslations here
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="rounded-2xl bg-white p-8 shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-semibold text-neutral-900">{SUBSCRIPTION_ENDED_TITLE}</h1>
          <p className="mt-4 text-neutral-600">{SUBSCRIPTION_ENDED_MESSAGE}</p>
          <p className="mt-4 text-sm text-neutral-500">
            Suporte:{' '}
            <a href={`mailto:${SUBSCRIPTION_ENDED_SUPPORT_HINT}`} className="text-blue-600 hover:underline">
              {SUBSCRIPTION_ENDED_SUPPORT_HINT}
            </a>
          </p>
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

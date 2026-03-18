import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBusinessBySlug, serializeBusinessForClient } from '@/lib/tenant';
import { BusinessProvider } from '@/lib/contexts/BusinessContext';
import { BrandingWrapper } from '@/components/branding/BrandingWrapper';

type Props = { children: ReactNode; params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return { title: 'Puncto' };
  return {
    title: `${business.displayName} | Agendamento`,
    ...(business.branding?.faviconUrl && {
      icons: { icon: business.branding.faviconUrl },
    }),
  };
}

export default async function BookingBySlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) notFound();

  if (business.subscription?.status === 'suspended' || business.subscription?.status === 'cancelled') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="rounded-2xl bg-white p-8 shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-semibold text-neutral-900">Conta Suspensa</h1>
          <p className="mt-4 text-neutral-600">
            Esta conta está atualmente suspensa. Entre em contato com o suporte.
          </p>
        </div>
      </div>
    );
  }

  const serialized = serializeBusinessForClient(business);

  return (
    <BusinessProvider business={serialized}>
      <BrandingWrapper branding={serialized.branding}>
        {children}
      </BrandingWrapper>
    </BusinessProvider>
  );
}

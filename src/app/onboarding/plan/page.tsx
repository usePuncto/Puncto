'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Plan selection happens on the industry page. This route redirects to industries.
 */
export default function OnboardingPlanPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/industries');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto" />
        <p className="mt-4 text-neutral-600">Redirecionando...</p>
      </div>
    </div>
  );
}

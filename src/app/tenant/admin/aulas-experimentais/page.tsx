'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExperimentalLessonsManager } from '@/components/education/ExperimentalLessonsManager';
import { useBusiness } from '@/lib/contexts/BusinessContext';

export default function AdminExperimentalLessonsPage() {
  const router = useRouter();
  const { business } = useBusiness();
  const isEducation = business?.industry === 'education';

  useEffect(() => {
    if (business && !isEducation) {
      router.replace('/tenant/admin/dashboard');
    }
  }, [business, isEducation, router]);

  if (!isEducation) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return <ExperimentalLessonsManager allowConvert />;
}

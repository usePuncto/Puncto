'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExperimentalLessonsManager } from '@/components/education/ExperimentalLessonsManager';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { teachersCanScheduleExperimentalLessons } from '@/lib/features/teacherExperimentalLessons';

export default function ProfessionalExperimentalLessonsPage() {
  const router = useRouter();
  const { business } = useBusiness();
  const allowed = teachersCanScheduleExperimentalLessons(business);

  useEffect(() => {
    if (business && !allowed) {
      router.replace('/tenant/professional');
    }
  }, [business, allowed, router]);

  if (!allowed) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return <ExperimentalLessonsManager allowConvert={false} />;
}

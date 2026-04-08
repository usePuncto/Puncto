import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StudentSubscription } from '@/types/studentSubscription';

function mapDate(value: unknown) {
  return (value as { toDate?: () => Date })?.toDate?.() || value;
}

/** Todas as assinaturas de mensalidade do negócio (admin). */
export function useAllStudentSubscriptionsForBusiness(businessId: string, enabled = true) {
  return useQuery({
    queryKey: ['studentSubscriptions', 'admin', businessId],
    enabled: !!businessId && enabled,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'studentSubscriptions');
      const snapshot = await getDocs(ref);
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
          id: docSnap.id,
          ...data,
          createdAt: mapDate(data.createdAt),
          updatedAt: mapDate(data.updatedAt),
          currentPeriodStart: mapDate(data.currentPeriodStart),
          currentPeriodEnd: mapDate(data.currentPeriodEnd),
        } as StudentSubscription;
      });
      return items.sort(
        (a, b) =>
          new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime(),
      );
    },
  });
}

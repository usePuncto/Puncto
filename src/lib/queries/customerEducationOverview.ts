import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Turma } from '@/types/turma';
import type { StudentSubscription } from '@/types/studentSubscription';
import type { Payment } from '@/types/payment';

function mapDate(value: unknown) {
  return (value as { toDate?: () => Date })?.toDate?.() || value;
}

export interface CustomerEducationOverview {
  turmas: Turma[];
  subscriptions: StudentSubscription[];
  payments: Payment[];
}

export function useCustomerEducationOverview(businessId: string, customerId: string | null) {
  return useQuery({
    queryKey: ['customerEducationOverview', businessId, customerId],
    enabled: !!businessId && !!customerId,
    queryFn: async (): Promise<CustomerEducationOverview> => {
      const cid = customerId as string;

      const turmasRef = collection(db, 'businesses', businessId, 'turmas');
      const turmasSnap = await getDocs(query(turmasRef, where('studentIds', 'array-contains', cid)));
      const turmas = turmasSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          ...data,
          createdAt: mapDate(data.createdAt),
          updatedAt: mapDate(data.updatedAt),
        } as Turma;
      });

      const subsRef = collection(db, 'businesses', businessId, 'studentSubscriptions');
      const subsSnap = await getDocs(query(subsRef, where('customerId', '==', cid)));
      const subscriptions = subsSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          ...data,
          createdAt: mapDate(data.createdAt),
          updatedAt: mapDate(data.updatedAt),
          currentPeriodStart: mapDate(data.currentPeriodStart),
          currentPeriodEnd: mapDate(data.currentPeriodEnd),
        } as StudentSubscription;
      });

      const payRef = collection(db, 'businesses', businessId, 'payments');
      const paySnap = await getDocs(query(payRef, where('customerId', '==', cid)));
      const payments = paySnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          ...data,
          createdAt: mapDate(data.createdAt),
          updatedAt: mapDate(data.updatedAt),
          succeededAt: mapDate(data.succeededAt),
          failedAt: mapDate(data.failedAt),
        } as Payment;
      });

      subscriptions.sort(
        (a, b) =>
          new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime(),
      );
      payments.sort(
        (a, b) =>
          new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime(),
      );

      return { turmas, subscriptions, payments };
    },
  });
}

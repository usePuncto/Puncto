import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PaymentLink } from '@/types/payment';

export function usePaymentLinks(businessId: string) {
  return useQuery({
    queryKey: ['paymentLinks', businessId],
    queryFn: async () => {
      const paymentLinksRef = collection(db, 'businesses', businessId, 'paymentLinks');
      const q = query(paymentLinksRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, any>;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          expiresAt: data.expiresAt?.toDate?.() || data.expiresAt,
          paidAt: data.paidAt?.toDate?.() || data.paidAt,
          cancelledAt: data.cancelledAt?.toDate?.() || data.cancelledAt,
        } as PaymentLink;
      });
    },
    enabled: !!businessId,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}


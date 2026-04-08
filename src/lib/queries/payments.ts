import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PaymentLink } from '@/types/payment';

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      amount: number;
      currency: string;
      customerEmail?: string;
      customerName?: string;
      description?: string;
      metadata?: Record<string, string>;
      successUrl: string;
      cancelUrl: string;
      paymentMethodTypes?: ('card' | 'pix')[];
    }) => {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      return response.json();
    },
  });
}

export function usePayments(businessId: string) {
  return useQuery({
    queryKey: ['payments', businessId],
    queryFn: async () => {
      const paymentsRef = collection(db, 'businesses', businessId, 'payments');
      const q = query(paymentsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, any>;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          succeededAt: data.succeededAt?.toDate?.() || data.succeededAt,
          failedAt: data.failedAt?.toDate?.() || data.failedAt,
        } as Payment;
      });
    },
    enabled: !!businessId,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function usePayment(paymentId: string, businessId: string) {
  return useQuery({
    queryKey: ['payment', businessId, paymentId],
    queryFn: async () => {
      const paymentRef = doc(db, 'businesses', businessId, 'payments', paymentId);
      const snapshot = await getDocs(collection(paymentRef.parent, paymentId));
      if (snapshot.empty) {
        throw new Error('Payment not found');
      }
      const data = snapshot.docs[0].data() as Record<string, any>;
      return { id: paymentId, ...data } as Payment;
    },
    enabled: !!paymentId && !!businessId,
  });
}

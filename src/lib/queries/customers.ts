import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer } from '@/types/booking';

/**
 * Fetch customers for a business
 */
export function useCustomers(businessId: string) {
  return useQuery({
    queryKey: ['customers', businessId],
    queryFn: async () => {
      const customersRef = collection(db, 'businesses', businessId, 'customers');
      const snapshot = await getDocs(customersRef);
      const customers = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, any>;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          lastBookingAt: data.lastBookingAt?.toDate?.() || data.lastBookingAt,
          lastVisitAt: data.lastVisitAt?.toDate?.() || data.lastVisitAt,
          consentDate: data.consentDate?.toDate?.() || data.consentDate,
        } as Customer;
      });
      return customers.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt as Date).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt as Date).getTime() : 0;
        return bDate - aDate;
      });
    },
    enabled: !!businessId,
  });
}

/**
 * Create a new customer
 */
export function useCreateCustomer(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
      notes?: string;
    }) => {
      const customersRef = collection(db, 'businesses', businessId, 'customers');
      const now = Timestamp.now();

      const data = {
        businessId,
        firstName: customerData.firstName.trim(),
        lastName: customerData.lastName.trim(),
        phone: customerData.phone.trim(),
        email: customerData.email?.trim() || '',
        totalBookings: 0,
        totalSpent: 0,
        consentGiven: true,
        notes: customerData.notes?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(customersRef, data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
    },
  });
}

/**
 * Update a customer
 */
export function useUpdateCustomer(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      updates,
    }: {
      customerId: string;
      updates: Partial<Customer>;
    }) => {
      const customerRef = doc(db, 'businesses', businessId, 'customers', customerId);
      await updateDoc(customerRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
      return { id: customerId, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
    },
  });
}

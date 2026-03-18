import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, BookingStatus } from '@/types/booking';

/**
 * Fetch bookings for a business
 */
export function useBookings(businessId: string, filters?: {
  status?: BookingStatus;
  professionalId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['bookings', businessId, filters],
    queryFn: async () => {
      const bookingsRef = collection(db, 'businesses', businessId, 'bookings');
      let q: any = query(bookingsRef);

      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }

      // Don't add professionalId to Firestore query - filter client-side to avoid composite index requirement
      if (filters?.professionalId) {
        // Omit from Firestore query; we filter below
      }

      if (filters?.startDate) {
        q = query(q, where('scheduledDateTime', '>=', Timestamp.fromDate(filters.startDate)));
      }

      if (filters?.endDate) {
        q = query(q, where('scheduledDateTime', '<=', Timestamp.fromDate(filters.endDate)));
      }

      q = query(q, orderBy('scheduledDateTime', 'asc'));

      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      let results = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, any>;
        return {
          id: doc.id,
          ...data,
          scheduledDateTime: data.scheduledDateTime?.toDate?.() || data.scheduledDateTime,
          endDateTime: data.endDateTime?.toDate?.() || data.endDateTime,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as Booking;
      });

      if (filters?.professionalId) {
        results = results.filter((b) => b.professionalId === filters.professionalId);
      }

      return results;
    },
    enabled: !!businessId,
  });
}

/**
 * Fetch a single booking
 */
export function useBooking(businessId: string, bookingId: string) {
  return useQuery({
    queryKey: ['booking', businessId, bookingId],
    queryFn: async () => {
      const bookingRef = doc(db, 'businesses', businessId, 'bookings', bookingId);
      const { getDoc } = await import('firebase/firestore');
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        throw new Error('Booking not found');
      }

      const bookingData = bookingSnap.data();
      return {
        id: bookingSnap.id,
        ...bookingData,
        scheduledDateTime: bookingData.scheduledDateTime?.toDate?.() || bookingData.scheduledDateTime,
        endDateTime: bookingData.endDateTime?.toDate?.() || bookingData.endDateTime,
        createdAt: bookingData.createdAt?.toDate?.() || bookingData.createdAt,
        updatedAt: bookingData.updatedAt?.toDate?.() || bookingData.updatedAt,
      } as Booking;
    },
    enabled: !!businessId && !!bookingId,
  });
}

/**
 * Create a new booking
 */
export function useCreateBooking(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => {
      const bookingsRef = collection(db, 'businesses', businessId, 'bookings');
      
      const data = {
        ...bookingData,
        scheduledDateTime: bookingData.scheduledDateTime instanceof Date
          ? Timestamp.fromDate(bookingData.scheduledDateTime)
          : bookingData.scheduledDateTime,
        endDateTime: bookingData.endDateTime instanceof Date
          ? Timestamp.fromDate(bookingData.endDateTime)
          : bookingData.endDateTime,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(bookingsRef, data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', businessId] });
    },
  });
}

/**
 * Update a booking
 */
export function useUpdateBooking(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, updates }: { bookingId: string; updates: Partial<Booking> }) => {
      const bookingRef = doc(db, 'businesses', businessId, 'bookings', bookingId);
      
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Convert Date objects to Timestamps
      if (updates.scheduledDateTime instanceof Date) {
        updateData.scheduledDateTime = Timestamp.fromDate(updates.scheduledDateTime);
      }
      if (updates.endDateTime instanceof Date) {
        updateData.endDateTime = Timestamp.fromDate(updates.endDateTime);
      }

      await updateDoc(bookingRef, updateData);
      return { id: bookingId, ...updates };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', businessId] });
      queryClient.invalidateQueries({ queryKey: ['booking', businessId, variables.bookingId] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { EventItem, EventRegistration, EventStatus } from '@/types/event';

function mapEventDoc(docSnap: QueryDocumentSnapshot): EventItem {
  const data = docSnap.data();
  const status = (data.status as EventStatus) || 'active';
  return {
    id: docSnap.id,
    businessId: (data.businessId as string) || '',
    name: (data.name as string) || '',
    date: (data.date as string) || '',
    location: (data.location as string) || '',
    status,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || data.createdAt,
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || data.updatedAt,
  } as EventItem;
}

function mapRegistrationDoc(docSnap: QueryDocumentSnapshot): EventRegistration {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    eventId: (data.eventId as string) || '',
    name: (data.name as string) || '',
    phone: (data.phone as string) || '',
    email: (data.email as string) || '',
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || data.createdAt,
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || data.updatedAt,
  } as EventRegistration;
}

export function useEvents(businessId: string) {
  return useQuery({
    queryKey: ['events', businessId],
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'events');
      const snapshot = await getDocs(ref);
      const list = snapshot.docs.map((d) => mapEventDoc(d));
      return list.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const ta = a.createdAt ? new Date(a.createdAt as Date).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt as Date).getTime() : 0;
        return tb - ta;
      });
    },
    enabled: !!businessId,
  });
}

export function useCreateEvent(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; date: string; location: string; status: EventStatus }) => {
      const now = Timestamp.now();
      const ref = collection(db, 'businesses', businessId, 'events');
      const data = {
        businessId,
        name: input.name.trim(),
        date: input.date,
        location: input.location.trim(),
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };
      const created = await addDoc(ref, data);
      return { id: created.id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', businessId] });
    },
  });
}

export function useUpdateEvent(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      updates: { name: string; date: string; location: string; status: EventStatus };
    }) => {
      const ref = doc(db, 'businesses', businessId, 'events', input.eventId);
      await updateDoc(ref, {
        name: input.updates.name.trim(),
        date: input.updates.date,
        location: input.updates.location.trim(),
        status: input.updates.status,
        updatedAt: Timestamp.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', businessId] });
    },
  });
}

export function useDeleteEvent(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      await deleteDoc(doc(db, 'businesses', businessId, 'events', eventId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', businessId] });
    },
  });
}

export function useEventRegistrations(businessId: string, eventId: string) {
  return useQuery({
    queryKey: ['eventRegistrations', businessId, eventId],
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'events', eventId, 'registrations');
      const snapshot = await getDocs(ref);
      const list = snapshot.docs.map((d) => mapRegistrationDoc(d));
      return list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt as Date).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt as Date).getTime() : 0;
        return tb - ta;
      });
    },
    enabled: !!businessId && !!eventId,
  });
}

export function useCreateEventRegistration(businessId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; phone: string; email: string }) => {
      const now = Timestamp.now();
      const ref = collection(db, 'businesses', businessId, 'events', eventId, 'registrations');
      const data = {
        eventId,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email.trim().toLowerCase(),
        createdAt: now,
        updatedAt: now,
      };
      const created = await addDoc(ref, data);
      return { id: created.id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventRegistrations', businessId, eventId] });
    },
  });
}

export function useUpdateEventRegistration(businessId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      registrationId: string;
      updates: { name: string; phone: string; email: string };
    }) => {
      const ref = doc(
        db,
        'businesses',
        businessId,
        'events',
        eventId,
        'registrations',
        input.registrationId,
      );
      await updateDoc(ref, {
        name: input.updates.name.trim(),
        phone: input.updates.phone.trim(),
        email: input.updates.email.trim().toLowerCase(),
        updatedAt: Timestamp.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventRegistrations', businessId, eventId] });
    },
  });
}

export function useDeleteEventRegistration(businessId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (registrationId: string) => {
      await deleteDoc(doc(db, 'businesses', businessId, 'events', eventId, 'registrations', registrationId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventRegistrations', businessId, eventId] });
    },
  });
}

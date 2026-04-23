import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TuitionType } from '@/types/tuitionType';

function mapDoc(docSnap: QueryDocumentSnapshot): TuitionType {
  const data = docSnap.data() as Record<string, unknown>;
  return {
    id: docSnap.id,
    businessId: String(data.businessId ?? ''),
    name: String(data.name ?? ''),
    suggestedAmountCents:
      typeof data.suggestedAmountCents === 'number' ? data.suggestedAmountCents : undefined,
    createdAt: ((data.createdAt as { toDate?: () => Date })?.toDate?.() ?? data.createdAt) as Date,
    updatedAt: ((data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? data.updatedAt) as Date,
  };
}

export function useTuitionTypes(businessId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['tuitionTypes', businessId],
    enabled: !!businessId && enabled,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'tuitionTypes');
      const snap = await getDocs(ref);
      return snap.docs.map(mapDoc).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },
  });
}

export function useTuitionTypeMutations(businessId: string) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (input: { name: string; suggestedAmountCents?: number }) => {
      const name = input.name.trim();
      if (!name) throw new Error('Nome é obrigatório');
      const ref = collection(db, 'businesses', businessId, 'tuitionTypes');
      const now = Timestamp.now();
      const docRef = await addDoc(ref, {
        businessId,
        name,
        ...(typeof input.suggestedAmountCents === 'number' && input.suggestedAmountCents > 0
          ? { suggestedAmountCents: Math.round(input.suggestedAmountCents) }
          : {}),
        createdAt: now,
        updatedAt: now,
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tuitionTypes', businessId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (tuitionTypeId: string) => {
      await deleteDoc(doc(db, 'businesses', businessId, 'tuitionTypes', tuitionTypeId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tuitionTypes', businessId] });
    },
  });

  return { create, remove };
}

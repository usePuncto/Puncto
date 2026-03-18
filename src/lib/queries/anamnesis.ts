import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AnamnesisForm, AnamnesisResponse } from '@/types/anamnesis';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Record<string, unknown>;
}

/**
 * Fetch all anamnesis forms for a business
 */
export function useAnamnesisForms(businessId: string) {
  return useQuery({
    queryKey: ['anamnesis_forms', businessId],
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'anamnesis_forms');
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? data.createdAt,
          updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? data.updatedAt,
        } as AnamnesisForm;
      });
    },
    enabled: !!businessId,
  });
}

/**
 * Create an anamnesis form
 */
export function useCreateAnamnesisForm(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; fields: AnamnesisForm['fields'] }) => {
      const ref = collection(db, 'businesses', businessId, 'anamnesis_forms');
      const data = stripUndefined({
        businessId,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        fields: input.fields,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      const docRef = await addDoc(ref, data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamnesis_forms', businessId] });
    },
  });
}

/**
 * Update an anamnesis form
 */
export function useUpdateAnamnesisForm(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      updates,
    }: {
      formId: string;
      updates: Partial<Pick<AnamnesisForm, 'name' | 'description' | 'fields'>>;
    }) => {
      const ref = doc(db, 'businesses', businessId, 'anamnesis_forms', formId);
      await updateDoc(ref, stripUndefined({ ...updates, updatedAt: Timestamp.now() }) as Record<string, unknown>);
      return { id: formId, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamnesis_forms', businessId] });
    },
  });
}

/**
 * Delete an anamnesis form
 */
export function useDeleteAnamnesisForm(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formId: string) => {
      const ref = doc(db, 'businesses', businessId, 'anamnesis_forms', formId);
      await deleteDoc(ref);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamnesis_forms', businessId] });
      queryClient.invalidateQueries({ queryKey: ['anamnesis_responses', businessId] });
    },
  });
}

/**
 * Fetch all anamnesis responses for a patient (for prontuário)
 */
export function useAnamnesisResponsesForPatient(businessId: string, patientId: string | null) {
  return useQuery({
    queryKey: ['anamnesis_responses', businessId, patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const ref = collection(db, 'businesses', businessId, 'anamnesis_responses');
      const q = query(ref, where('patientId', '==', patientId));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            ...data,
            filledAt: (data.filledAt as Timestamp)?.toDate?.() ?? data.filledAt,
            createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? data.createdAt,
          } as AnamnesisResponse;
        })
        .sort((a, b) => {
          const at = a.filledAt ? new Date(a.filledAt as Date).getTime() : 0;
          const bt = b.filledAt ? new Date(b.filledAt as Date).getTime() : 0;
          return bt - at;
        });
    },
    enabled: !!businessId && !!patientId,
  });
}

/**
 * Save a new anamnesis response (fill a form for a patient)
 */
export function useSaveAnamnesisResponse(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      patientId: string;
      formId: string;
      formName: string;
      answers: Record<string, string | number | boolean | string[]>;
      filledBy?: string;
      filledByName?: string;
    }) => {
      const ref = collection(db, 'businesses', businessId, 'anamnesis_responses');
      const now = Timestamp.now();
      // Remove undefined values from answers (Firestore does not accept undefined)
      const answers = Object.fromEntries(
        Object.entries(input.answers).filter(([, v]) => v !== undefined)
      ) as Record<string, string | number | boolean | string[]>;
      const data = stripUndefined({
        businessId,
        patientId: input.patientId,
        formId: input.formId,
        formName: input.formName,
        answers,
        filledBy: input.filledBy,
        filledByName: input.filledByName,
        filledAt: now,
        createdAt: now,
      });
      const docRef = await addDoc(ref, data);
      return { id: docRef.id, ...data };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['anamnesis_responses', businessId, variables.patientId] });
    },
  });
}

/**
 * Get a single form by id (e.g. for filling)
 */
export async function getAnamnesisForm(
  businessId: string,
  formId: string
): Promise<AnamnesisForm | null> {
  const ref = doc(db, 'businesses', businessId, 'anamnesis_forms', formId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? data.createdAt,
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? data.updatedAt,
  } as AnamnesisForm;
}

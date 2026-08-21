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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Professional } from '@/types/business';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';
import {
  deleteContactFields,
  readProfessionalContactClient,
  withoutContactPii,
  writeProfessionalContactClient,
} from '@/lib/professionals/contact';

/**
 * Fetch professionals for a business.
 * Staff sessions also merge private contact (email/phone).
 */
export function useProfessionals(businessId: string, filters?: { active?: boolean; canBookOnline?: boolean }) {
  return useQuery({
    queryKey: ['professionals', businessId, filters],
    queryFn: async () => {
      const professionalsRef = collection(db, 'businesses', businessId, 'professionals');
      let q: any = query(professionalsRef);

      if (filters?.active !== undefined) {
        q = query(q, where('active', '==', filters.active));
      }

      if (filters?.canBookOnline !== undefined) {
        q = query(q, where('canBookOnline', '==', filters.canBookOnline));
      }

      const snapshot = await getDocs(q);
      const base = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, any>;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as Professional;
      });

      // Best-effort merge of private contact for staff (public guests get empty on denied)
      return Promise.all(
        base.map(async (pro) => {
          const contact = await readProfessionalContactClient(db, businessId, pro.id);
          return {
            ...pro,
            email: contact.email ?? pro.email,
            phone: contact.phone ?? pro.phone,
          };
        })
      );
    },
    enabled: !!businessId,
  });
}

/**
 * Fetch a single professional
 */
export function useProfessional(businessId: string, professionalId: string) {
  return useQuery({
    queryKey: ['professional', businessId, professionalId],
    queryFn: async () => {
      const professionalRef = doc(db, 'businesses', businessId, 'professionals', professionalId);
      const snapshot = await getDoc(professionalRef);

      if (!snapshot.exists()) {
        throw new Error('Professional not found');
      }

      const data = snapshot.data() as Record<string, any>;
      const contact = await readProfessionalContactClient(db, businessId, professionalId);
      return {
        id: snapshot.id,
        ...data,
        email: contact.email ?? data.email,
        phone: contact.phone ?? data.phone,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as Professional;
    },
    enabled: !!businessId && !!professionalId,
  });
}

/** Remove undefined values; Firestore does not accept undefined. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;
}

/**
 * Create a new professional
 */
export function useCreateProfessional(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (professionalData: Omit<Professional, 'id' | 'createdAt' | 'updatedAt' | 'businessId'>) => {
      const professionalsRef = collection(db, 'businesses', businessId, 'professionals');
      const email = professionalData.email;
      const phone = professionalData.phone;

      const data = stripUndefined(
        withoutContactPii({
          ...professionalData,
          businessId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        } as Record<string, unknown>)
      );

      const docRef = await addDoc(professionalsRef, data);
      if (email || phone) {
        await writeProfessionalContactClient(db, businessId, docRef.id, {
          email: email || '',
          phone: phone || '',
        });
      }
      return { id: docRef.id, ...data, email, phone };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', businessId] });
    },
  });
}

/**
 * Delete a professional (owner professionals cannot be deleted)
 */
export function useDeleteProfessional(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (professionalId: string) => {
      const res = await fetch(`/api/professionals/${professionalId}?businessId=${businessId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao excluir');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', businessId] });
    },
  });
}

/**
 * Update a professional
 */
export function useUpdateProfessional(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      professionalId,
      updates,
    }: {
      professionalId: string;
      updates: Partial<Professional>;
    }) => {
      const professionalRef = doc(db, 'businesses', businessId, 'professionals', professionalId);
      const email = updates.email;
      const phone = updates.phone;

      const publicUpdates = withoutContactPii(
        stripUndefined({
          ...updates,
          updatedAt: Timestamp.now(),
        }) as Record<string, unknown>
      );

      await updateDoc(professionalRef, {
        ...publicUpdates,
        // Migrate legacy PII off the public document
        ...deleteContactFields,
      } as Record<string, unknown>);

      if (email !== undefined || phone !== undefined) {
        await writeProfessionalContactClient(db, businessId, professionalId, {
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined ? { phone } : {}),
        });
      }

      return { id: professionalId, ...updates };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['professionals', businessId] });
      queryClient.invalidateQueries({
        queryKey: ['professional', businessId, variables.professionalId],
      });
    },
  });
}

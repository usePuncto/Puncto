import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  deleteField,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Turma, TurmaScheduleSlot } from '@/types/turma';

function mapTurmaDoc(docSnap: QueryDocumentSnapshot): Turma {
  const data = docSnap.data();
  const schedules = Array.isArray(data.schedules)
    ? (data.schedules as TurmaScheduleSlot[]).filter(
        (slot) => slot && typeof slot.startTime === 'string' && typeof slot.endTime === 'string',
      )
    : [];
  const professionalId =
    typeof data.professionalId === 'string' && data.professionalId.trim() !== ''
      ? data.professionalId
      : undefined;
  const maxStudents =
    typeof data.maxStudents === 'number' && Number.isFinite(data.maxStudents) && data.maxStudents > 0
      ? Math.floor(data.maxStudents)
      : undefined;
  const isVip = data.isVip === true;
  return {
    id: docSnap.id,
    businessId: (data.businessId as string) || '',
    name: (data.name as string) || '',
    description: typeof data.description === 'string' ? data.description : '',
    maxStudents,
    professionalId,
    studentIds: Array.isArray(data.studentIds) ? (data.studentIds as string[]) : [],
    schedules,
    isVip,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || data.createdAt,
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || data.updatedAt,
  } as Turma;
}

export function useTurmas(businessId: string) {
  return useQuery({
    queryKey: ['turmas', businessId],
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'turmas');
      const snapshot = await getDocs(ref);
      const list = snapshot.docs.map((d) => mapTurmaDoc(d));
      return list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt as Date).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt as Date).getTime() : 0;
        return tb - ta;
      });
    },
    enabled: !!businessId,
  });
}

export function useCreateTurma(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      schedules?: TurmaScheduleSlot[];
      maxStudents?: number;
      isVip?: boolean;
      professionalId?: string;
      studentIds?: string[];
    }) => {
      const ref = collection(db, 'businesses', businessId, 'turmas');
      const now = Timestamp.now();
      const normalizedMaxStudents =
        typeof input.maxStudents === 'number' && Number.isFinite(input.maxStudents) && input.maxStudents > 0
          ? Math.floor(input.maxStudents)
          : undefined;
      const professionalId =
        typeof input.professionalId === 'string' && input.professionalId.trim() !== ''
          ? input.professionalId.trim()
          : undefined;
      const studentIds = Array.isArray(input.studentIds)
        ? [...new Set(input.studentIds.filter((id) => typeof id === 'string' && id.trim() !== ''))]
        : [];
      const data = {
        businessId,
        name: input.name.trim(),
        description: (input.description || '').trim(),
        studentIds,
        schedules: input.schedules || [],
        ...(normalizedMaxStudents ? { maxStudents: normalizedMaxStudents } : {}),
        ...(input.isVip ? { isVip: true } : {}),
        ...(professionalId ? { professionalId } : {}),
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(ref, data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turmas', businessId] });
    },
  });
}

export function useUpdateTurma(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      turmaId,
      updates,
    }: {
      turmaId: string;
      updates: Partial<Pick<Turma, 'name' | 'description' | 'studentIds' | 'schedules' | 'professionalId'>> & {
        maxStudents?: number | null;
      };
    }) => {
      const ref = doc(db, 'businesses', businessId, 'turmas', turmaId);
      const payload: Record<string, unknown> = { updatedAt: Timestamp.now() };
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.description !== undefined) payload.description = updates.description.trim();
      if (updates.studentIds !== undefined) payload.studentIds = updates.studentIds;
      if (updates.schedules !== undefined) payload.schedules = updates.schedules;
      if (updates.maxStudents !== undefined) {
        payload.maxStudents =
          typeof updates.maxStudents === 'number' &&
          Number.isFinite(updates.maxStudents) &&
          updates.maxStudents > 0
            ? Math.floor(updates.maxStudents)
            : deleteField();
      }
      if (updates.professionalId !== undefined) {
        payload.professionalId =
          updates.professionalId && updates.professionalId.trim() !== ''
            ? updates.professionalId.trim()
            : deleteField();
      }
      await updateDoc(ref, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turmas', businessId] });
    },
  });
}

export function useDeleteTurma(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (turmaId: string) => {
      await deleteDoc(doc(db, 'businesses', businessId, 'turmas', turmaId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turmas', businessId] });
    },
  });
}

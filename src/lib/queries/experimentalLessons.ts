import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ExperimentalLesson } from '@/types/experimentalLesson';

function mapDate(value: unknown) {
  return (value as { toDate?: () => Date } | undefined)?.toDate?.() || value;
}

function mapDoc(id: string, data: Record<string, unknown>): ExperimentalLesson {
  return {
    id,
    businessId: (data.businessId as string) || '',
    studentId: (data.studentId as string) || '',
    turmaId: (data.turmaId as string) || '',
    date: (data.date as string) || '',
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    createdAt: mapDate(data.createdAt) as Date,
    updatedAt: mapDate(data.updatedAt) as Date,
  };
}

export function useExperimentalLessons(businessId: string) {
  return useQuery({
    queryKey: ['experimentalLessons', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'experimentalLessons');
      const snap = await getDocs(ref);
      return snap.docs
        .map((docSnap) => mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
        .sort((a, b) => {
          const dateCmp = b.date.localeCompare(a.date);
          if (dateCmp !== 0) return dateCmp;
          return new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime();
        });
    },
  });
}

/** Aulas experimentais de uma turma em uma data (lista de chamada). */
export function useExperimentalLessonsForTurmaDate(
  businessId: string,
  turmaId: string,
  date: string,
) {
  return useQuery({
    queryKey: ['experimentalLessons', 'byTurmaDate', businessId, turmaId, date],
    enabled: !!businessId && !!turmaId && !!date,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'experimentalLessons');
      const q = query(ref, where('turmaId', '==', turmaId), where('date', '==', date));
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) =>
        mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
      );
    },
  });
}

export function useCreateExperimentalLesson(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      studentId: string;
      turmaId: string;
      date: string;
      notes?: string;
    }) => {
      const ref = collection(db, 'businesses', businessId, 'experimentalLessons');
      const now = Timestamp.now();
      const data = {
        businessId,
        studentId: input.studentId,
        turmaId: input.turmaId,
        date: input.date,
        notes: input.notes?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(ref, data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experimentalLessons'] });
    },
  });
}

export function useUpdateExperimentalLesson(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lessonId: string;
      turmaId?: string;
      date?: string;
      notes?: string;
    }) => {
      const lessonRef = doc(db, 'businesses', businessId, 'experimentalLessons', input.lessonId);
      const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
      if (input.turmaId !== undefined) updates.turmaId = input.turmaId;
      if (input.date !== undefined) updates.date = input.date;
      if (input.notes !== undefined) updates.notes = input.notes.trim();
      await updateDoc(lessonRef, updates);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experimentalLessons'] });
    },
  });
}

export function useDeleteExperimentalLesson(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      await deleteDoc(doc(db, 'businesses', businessId, 'experimentalLessons', lessonId));
      return lessonId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experimentalLessons'] });
    },
  });
}

/** Converte aluno experimental em aluno fixo: matricula em turmas e remove agendamentos experimentais. */
export function useConvertExperimentalStudent(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      studentId: string;
      turmaIds: string[];
      tuitionTypeId?: string;
    }) => {
      if (!input.turmaIds.length) {
        throw new Error('Selecione ao menos uma turma para matricular o aluno.');
      }

      const customerRef = doc(db, 'businesses', businessId, 'customers', input.studentId);
      const customerSnap = await getDoc(customerRef);
      if (!customerSnap.exists()) {
        throw new Error('Aluno não encontrado.');
      }

      const customerUpdates: Record<string, unknown> = {
        isExperimentalStudent: deleteField(),
        updatedAt: Timestamp.now(),
      };
      if (input.tuitionTypeId) {
        customerUpdates.tuitionTypeId = input.tuitionTypeId;
      }
      await updateDoc(customerRef, customerUpdates);

      for (const turmaId of input.turmaIds) {
        const turmaRef = doc(db, 'businesses', businessId, 'turmas', turmaId);
        const turmaSnap = await getDoc(turmaRef);
        if (!turmaSnap.exists()) {
          throw new Error('Uma das turmas selecionadas não foi encontrada.');
        }
        const turmaData = turmaSnap.data();
        const studentIds = Array.isArray(turmaData.studentIds)
          ? [...(turmaData.studentIds as string[])]
          : [];
        if (studentIds.includes(input.studentId)) continue;

        const maxStudents =
          typeof turmaData.maxStudents === 'number' &&
          Number.isFinite(turmaData.maxStudents) &&
          turmaData.maxStudents > 0
            ? Math.floor(turmaData.maxStudents)
            : undefined;
        if (maxStudents && studentIds.length >= maxStudents) {
          const turmaName = typeof turmaData.name === 'string' ? turmaData.name : 'Turma';
          throw new Error(`A turma "${turmaName}" atingiu o limite de alunos.`);
        }

        await updateDoc(turmaRef, {
          studentIds: [...studentIds, input.studentId],
          updatedAt: Timestamp.now(),
        });
      }

      const lessonsRef = collection(db, 'businesses', businessId, 'experimentalLessons');
      const lessonsQ = query(lessonsRef, where('studentId', '==', input.studentId));
      const lessonsSnap = await getDocs(lessonsQ);
      await Promise.all(lessonsSnap.docs.map((lessonDoc) => deleteDoc(lessonDoc.ref)));

      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experimentalLessons'] });
      queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
      queryClient.invalidateQueries({ queryKey: ['turmas', businessId] });
    },
  });
}

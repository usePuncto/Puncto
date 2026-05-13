import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AttendanceRollCall, RollCallStatus } from '@/types/attendance';

function mapDoc(docSnap: QueryDocumentSnapshot): AttendanceRollCall {
  const data = docSnap.data() as Record<string, unknown>;
  return {
    id: docSnap.id,
    businessId: (data.businessId as string) || '',
    turmaId: (data.turmaId as string) || '',
    studentId: (data.studentId as string) || '',
    date: (data.date as string) || '',
    status: (data.status as RollCallStatus) || 'pending',
    replacementRequestIds: Array.isArray(data.replacementRequestIds)
      ? (data.replacementRequestIds as string[])
      : undefined,
    markedAt:
      (data.markedAt as { toDate?: () => Date })?.toDate?.() ||
      (data.markedAt as unknown as Date),
    updatedAt:
      (data.updatedAt as { toDate?: () => Date })?.toDate?.() ||
      (data.updatedAt as unknown as Date),
  };
}

export function useAttendanceRollCallsByTurmaDate(
  businessId: string,
  turmaId: string,
  date: string,
) {
  return useQuery({
    queryKey: ['attendanceRollCalls', businessId, turmaId, date],
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'attendanceRollCalls');
      const q = query(ref, where('turmaId', '==', turmaId), where('date', '==', date));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => mapDoc(d));
    },
    enabled: !!businessId && !!turmaId && !!date,
  });
}

export function useAttendanceRollCallsRange(
  businessId: string,
  startDate: string,
  endDate: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['attendanceRollCallsRange', businessId, startDate, endDate],
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'attendanceRollCalls');
      const snapshot = await getDocs(ref);
      const all = snapshot.docs.map((d) => mapDoc(d));
      if (!startDate || !endDate) return all;
      return all.filter((r) => r.date >= startDate && r.date <= endDate);
    },
    enabled: !!businessId && !!startDate && !!endDate && enabled,
  });
}

export function useUpsertAttendanceRollCall(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      turmaId: string;
      studentId: string;
      date: string;
      status: RollCallStatus;
    }) => {
      const { turmaId, studentId, date, status } = params;
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) throw new Error('Sessao expirada. Faca login novamente.');

      const res = await fetch('/api/attendance/roll-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          turmaId,
          studentId,
          date,
          status,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message: string | undefined;
        try {
          const data = JSON.parse(text) as { error?: string; message?: string };
          message = (typeof data.error === 'string' && data.error) || (typeof data.message === 'string' && data.message);
        } catch {
          message = text.trim() ? text.trim().slice(0, 240) : undefined;
        }
        throw new Error(
          message ||
            `Não foi possível registrar a chamada (código ${res.status}). Tente de novo ou atualize a página.`,
        );
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attendanceRollCalls', businessId, variables.turmaId, variables.date],
      });
    },
  });
}

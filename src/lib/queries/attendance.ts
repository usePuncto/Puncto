import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
      const id = `${turmaId}_${date}_${studentId}`;
      const ref = doc(db, 'businesses', businessId, 'attendanceRollCalls', id);
      const now = Timestamp.now();

      await setDoc(
        ref,
        {
          businessId,
          turmaId,
          studentId,
          date,
          status,
          markedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attendanceRollCalls', businessId, variables.turmaId, variables.date],
      });
    },
  });
}

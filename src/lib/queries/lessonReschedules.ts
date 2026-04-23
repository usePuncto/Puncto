import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { LessonRescheduleRequest, LessonRescheduleRequestStatus } from '@/types/lessonReschedule';

function mapDate(value: unknown) {
  return (value as { toDate?: () => Date } | undefined)?.toDate?.() || value;
}

function mapDoc(
  id: string,
  data: Record<string, unknown>,
): LessonRescheduleRequest {
  return {
    id,
    businessId: (data.businessId as string) || '',
    attendanceRollCallId: (data.attendanceRollCallId as string) || '',
    turmaId: (data.turmaId as string) || '',
    studentId: (data.studentId as string) || '',
    requestedDate: (data.requestedDate as string) || '',
    requestedStartTime: (data.requestedStartTime as string) || '',
    requestedEndTime: (data.requestedEndTime as string) || '',
    professionalId:
      typeof data.professionalId === 'string' && data.professionalId.trim()
        ? data.professionalId
        : undefined,
    status: (data.status as LessonRescheduleRequestStatus) || 'pending',
    requestedByUserId: (data.requestedByUserId as string) || '',
    reason: typeof data.reason === 'string' ? data.reason : undefined,
    reviewedByUserId:
      typeof data.reviewedByUserId === 'string' ? data.reviewedByUserId : undefined,
    reviewNote: typeof data.reviewNote === 'string' ? data.reviewNote : undefined,
    reviewedAt: mapDate(data.reviewedAt) as Date,
    approvedAt: mapDate(data.approvedAt) as Date,
    approvedByUserId:
      typeof data.approvedByUserId === 'string' ? data.approvedByUserId : undefined,
    replacementBookingId:
      typeof data.replacementBookingId === 'string' ? data.replacementBookingId : undefined,
    createdAt: mapDate(data.createdAt) as Date,
    updatedAt: mapDate(data.updatedAt) as Date,
  };
}

async function getIdTokenOrThrow() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessao expirada. Faca login novamente.');
  return user.getIdToken();
}

type ManageSuccess = { success?: boolean; requestId?: string; replacementBookingId?: string };

async function postManage(payload: Record<string, unknown>): Promise<ManageSuccess> {
  const token = await getIdTokenOrThrow();
  const res = await fetch('/api/students/reschedules/manage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as ManageSuccess & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao processar remarcacao.');
  }
  return data;
}

export function useStudentRescheduleRequests(
  businessId: string,
  studentId?: string,
) {
  return useQuery({
    queryKey: ['lessonRescheduleRequests', 'student', businessId, studentId],
    enabled: !!businessId && !!studentId,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'lessonRescheduleRequests');
      const q = query(ref, where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
        .sort(
          (a, b) =>
            new Date(b.createdAt as Date).getTime() -
            new Date(a.createdAt as Date).getTime(),
        );
    },
  });
}

/** Pedidos de remarcação para uma turma e data (ex.: lista de chamada com visitantes). */
export function useLessonRescheduleRequestsForTurmaDate(
  businessId: string,
  turmaId: string,
  date: string,
) {
  return useQuery({
    queryKey: ['lessonRescheduleRequests', 'byTurmaDate', businessId, turmaId, date],
    enabled: !!businessId && !!turmaId && !!date,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'lessonRescheduleRequests');
      const q = query(ref, where('turmaId', '==', turmaId), where('requestedDate', '==', date));
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) =>
        mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
      );
    },
  });
}

export function useStaffRescheduleRequests(
  businessId: string,
  options?: {
    status?: LessonRescheduleRequestStatus | 'all';
    professionalId?: string;
  },
) {
  return useQuery({
    queryKey: ['lessonRescheduleRequests', 'staff', businessId, options],
    enabled: !!businessId,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'lessonRescheduleRequests');
      const q =
        options?.status && options.status !== 'all'
          ? query(ref, where('status', '==', options.status))
          : query(ref);
      const snap = await getDocs(q);
      let rows = snap.docs.map((docSnap) =>
        mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
      );
      if (options?.professionalId) {
        rows = rows.filter((row) => row.professionalId === options.professionalId);
      }
      return rows.sort(
        (a, b) =>
          new Date(b.createdAt as Date).getTime() -
          new Date(a.createdAt as Date).getTime(),
      );
    },
  });
}

export function useCreateRescheduleRequest(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attendanceRollCallId: string;
      /** Turma da grade escolhida para a reposição (opcional: default é a turma da falta). */
      targetTurmaId?: string;
      requestedDate: string;
      requestedStartTime: string;
      requestedEndTime: string;
      professionalId?: string;
      reason?: string;
    }) =>
      postManage({
        action: 'create_request',
        businessId,
        ...input,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lessonRescheduleRequests'] });
      await queryClient.refetchQueries({
        queryKey: ['lessonRescheduleRequests'],
        type: 'active',
      });
      queryClient.invalidateQueries({ queryKey: ['studentAttendance', businessId] });
      queryClient.invalidateQueries({ queryKey: ['replacementSlotCatalog', businessId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', businessId] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', businessId] });
    },
  });
}

export function useCancelRescheduleRequest(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string }) =>
      postManage({
        action: 'cancel_request',
        businessId,
        requestId: input.requestId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lessonRescheduleRequests'] });
      await queryClient.refetchQueries({ queryKey: ['lessonRescheduleRequests'], type: 'active' });
    },
  });
}

export function useReviewRescheduleRequest(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      decision: 'approve' | 'reject';
      reviewNote?: string;
    }) =>
      postManage({
        action: input.decision === 'approve' ? 'approve_request' : 'reject_request',
        businessId,
        requestId: input.requestId,
        reviewNote: input.reviewNote,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lessonRescheduleRequests'] });
      await queryClient.refetchQueries({ queryKey: ['lessonRescheduleRequests'], type: 'active' });
      queryClient.invalidateQueries({ queryKey: ['bookings', businessId] });
    },
  });
}

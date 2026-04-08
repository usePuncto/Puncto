import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AttendanceRollCall } from '@/types/attendance';
import type { Payment } from '@/types/payment';
import type { Turma } from '@/types/turma';
import type { StudentSubscription } from '@/types/studentSubscription';

function mapDate(value: any) {
  return value?.toDate?.() || value;
}

export function useStudentTurmas(businessId: string, studentCustomerId?: string) {
  return useQuery({
    queryKey: ['studentTurmas', businessId, studentCustomerId],
    enabled: !!businessId && !!studentCustomerId,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'turmas');
      const q = query(ref, where('studentIds', 'array-contains', studentCustomerId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, any>;
        return {
          id: doc.id,
          ...data,
          createdAt: mapDate(data.createdAt),
          updatedAt: mapDate(data.updatedAt),
        } as Turma;
      });
    },
  });
}

export function useStudentAttendance(businessId: string, studentCustomerId?: string) {
  return useQuery({
    queryKey: ['studentAttendance', businessId, studentCustomerId],
    enabled: !!businessId && !!studentCustomerId,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'attendanceRollCalls');
      const q = query(ref, where('studentId', '==', studentCustomerId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, any>;
        return {
          id: doc.id,
          ...data,
          markedAt: mapDate(data.markedAt),
          updatedAt: mapDate(data.updatedAt),
        } as AttendanceRollCall;
      });
    },
  });
}

export function useStudentPayments(businessId: string, studentCustomerId?: string) {
  return useQuery({
    queryKey: ['studentPayments', businessId, studentCustomerId],
    enabled: !!businessId && !!studentCustomerId,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'payments');
      const q = query(ref, where('customerId', '==', studentCustomerId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, any>;
        return {
          id: doc.id,
          ...data,
          createdAt: mapDate(data.createdAt),
          updatedAt: mapDate(data.updatedAt),
          succeededAt: mapDate(data.succeededAt),
        } as Payment;
      });
      return items.sort((a, b) => new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime());
    },
  });
}

export function useStudentSubscriptions(businessId: string, studentCustomerId?: string) {
  return useQuery({
    queryKey: ['studentSubscriptions', businessId, studentCustomerId],
    enabled: !!businessId && !!studentCustomerId,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'studentSubscriptions');
      const q = query(ref, where('customerId', '==', studentCustomerId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, any>;
        return {
          id: doc.id,
          ...data,
          createdAt: mapDate(data.createdAt),
          updatedAt: mapDate(data.updatedAt),
          currentPeriodStart: mapDate(data.currentPeriodStart),
          currentPeriodEnd: mapDate(data.currentPeriodEnd),
        } as StudentSubscription;
      });
      return items.sort((a, b) => new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime());
    },
  });
}

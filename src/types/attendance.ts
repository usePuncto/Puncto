import type { Timestamp } from 'firebase/firestore';

export type RollCallStatus = 'pending' | 'present' | 'absent' | 'justified';

export interface AttendanceRollCall {
  id: string;
  businessId: string;
  turmaId: string;
  studentId: string;
  date: string; // yyyy-MM-dd
  status: RollCallStatus;
  /** IDs de solicitações de reposição vinculadas a esta falta. */
  replacementRequestIds?: string[];
  markedAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

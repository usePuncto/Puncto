import type { Timestamp } from 'firebase/firestore';

export type RollCallStatus = 'pending' | 'present' | 'absent' | 'justified';

export interface AttendanceRollCall {
  id: string;
  businessId: string;
  turmaId: string;
  studentId: string;
  date: string; // yyyy-MM-dd
  status: RollCallStatus;
  markedAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

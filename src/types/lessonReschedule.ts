import type { Timestamp } from 'firebase/firestore';

export type LessonRescheduleRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled_by_student';

export interface LessonRescheduleRequest {
  id: string;
  businessId: string;
  attendanceRollCallId: string;
  turmaId: string;
  studentId: string;
  requestedDate: string; // yyyy-MM-dd
  requestedStartTime: string; // HH:mm
  requestedEndTime: string; // HH:mm
  professionalId?: string;
  status: LessonRescheduleRequestStatus;
  requestedByUserId: string;
  reason?: string;
  reviewedByUserId?: string;
  reviewNote?: string;
  reviewedAt?: Timestamp | Date;
  approvedAt?: Timestamp | Date;
  approvedByUserId?: string;
  replacementBookingId?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

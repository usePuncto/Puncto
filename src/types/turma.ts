import type { Timestamp } from 'firebase/firestore';

export type TurmaWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TurmaScheduleSlot {
  weekday: TurmaWeekday;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface Turma {
  id: string;
  businessId: string;
  name: string;
  description: string;
  /** Professor vinculado (`businesses/{id}/professionals`) */
  professionalId?: string;
  /** IDs de documentos em `businesses/{id}/customers` */
  studentIds: string[];
  /** Dias e horários de aula da turma */
  schedules: TurmaScheduleSlot[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

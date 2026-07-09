import type { Timestamp } from 'firebase/firestore';

/** Agendamento de aula experimental: aluno visitante em uma turma em data específica. */
export interface ExperimentalLesson {
  id: string;
  businessId: string;
  /** Customer com isExperimentalStudent */
  studentId: string;
  turmaId: string;
  /** yyyy-MM-dd — único dia em que o aluno aparece na lista de chamada desta turma */
  date: string;
  notes?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

import type { Customer } from '@/types/booking';
import type { LessonRescheduleRequest } from '@/types/lessonReschedule';
import type { Turma } from '@/types/turma';
import { turmaScheduleMatchesTimeOnDate } from '@/lib/utils/turmaClassDays';

export type RollCallDisplayRow = {
  student: Customer;
  /** Aluno de outra turma com reposição aprovada neste dia/horário. */
  isReplacementGuest: boolean;
};

/**
 * Alunos matriculados na turma + visitantes de remarcação (outra turma) aprovados
 * para o mesmo dia/horário da grade.
 */
export function buildRollCallRowsWithReplacementGuests(
  turma: Pick<Turma, 'schedules' | 'studentIds'>,
  rollCallDate: string,
  enrolledStudents: Customer[],
  rescheduleRequestsOnDate: LessonRescheduleRequest[],
  customerById: Map<string, Customer>,
): RollCallDisplayRow[] {
  const enrolledIds = new Set(turma.studentIds || []);
  const approved = rescheduleRequestsOnDate.filter((r) => r.status === 'approved');
  const crossTurmaForSlot = approved.filter(
    (r) =>
      turmaScheduleMatchesTimeOnDate(turma, rollCallDate, r.requestedStartTime, r.requestedEndTime) &&
      !enrolledIds.has(r.studentId),
  );

  const rows: RollCallDisplayRow[] = enrolledStudents.map((student) => ({
    student,
    isReplacementGuest: false,
  }));

  const seen = new Set(enrolledStudents.map((s) => s.id));
  for (const r of crossTurmaForSlot) {
    if (seen.has(r.studentId)) continue;
    const customer = customerById.get(r.studentId);
    if (!customer) continue;
    seen.add(r.studentId);
    rows.push({ student: customer, isReplacementGuest: true });
  }
  return rows;
}

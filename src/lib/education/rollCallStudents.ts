import type { Customer } from '@/types/booking';
import type { ExperimentalLesson } from '@/types/experimentalLesson';
import type { LessonRescheduleRequest } from '@/types/lessonReschedule';
import type { Turma } from '@/types/turma';
import { turmaScheduleMatchesTimeOnDate } from '@/lib/utils/turmaClassDays';

export type RollCallDisplayRow = {
  student: Customer;
  /** Aluno de outra turma com reposição aprovada neste dia/horário. */
  isReplacementGuest: boolean;
  /** Aluno experimental agendado somente para esta data. */
  isExperimentalGuest: boolean;
};

/**
 * Alunos matriculados na turma + visitantes de remarcação (outra turma) aprovados
 * para o mesmo dia/horário da grade + alunos experimentais na data agendada.
 */
export function buildRollCallRowsWithReplacementGuests(
  turma: Pick<Turma, 'schedules' | 'studentIds'>,
  rollCallDate: string,
  enrolledStudents: Customer[],
  rescheduleRequestsOnDate: LessonRescheduleRequest[],
  customerById: Map<string, Customer>,
  experimentalLessonsOnDate: ExperimentalLesson[] = [],
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
    isExperimentalGuest: false,
  }));

  const seen = new Set(enrolledStudents.map((s) => s.id));
  for (const r of crossTurmaForSlot) {
    if (seen.has(r.studentId)) continue;
    const customer = customerById.get(r.studentId);
    if (!customer) continue;
    seen.add(r.studentId);
    rows.push({ student: customer, isReplacementGuest: true, isExperimentalGuest: false });
  }

  for (const lesson of experimentalLessonsOnDate) {
    if (seen.has(lesson.studentId)) continue;
    const customer = customerById.get(lesson.studentId);
    if (!customer) continue;
    seen.add(lesson.studentId);
    rows.push({ student: customer, isReplacementGuest: false, isExperimentalGuest: true });
  }

  return rows;
}

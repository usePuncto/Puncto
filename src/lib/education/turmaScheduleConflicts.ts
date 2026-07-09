import type { Turma, TurmaScheduleSlot } from '@/types/turma';

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/** Dois intervalos no mesmo dia se sobrepõem (fim exato = início do outro não conflita). */
export function scheduleSlotsOverlap(a: TurmaScheduleSlot, b: TurmaScheduleSlot): boolean {
  if (a.weekday !== b.weekday) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  if (aStart >= aEnd || bStart >= bEnd) return false;
  return aStart < bEnd && bStart < aEnd;
}

export type TurmaScheduleConflict = {
  turmaId: string;
  turmaName: string;
  existingSlot: TurmaScheduleSlot;
  candidateSlot: TurmaScheduleSlot;
};

/**
 * Verifica se os horários candidatos conflitam com outras turmas/aulas VIP do mesmo professor.
 */
export function findProfessorTurmaScheduleConflicts(
  allTurmas: Pick<Turma, 'id' | 'name' | 'professionalId' | 'schedules'>[],
  professionalId: string,
  candidateSlots: TurmaScheduleSlot[],
  options?: { excludeTurmaId?: string },
): TurmaScheduleConflict[] {
  const profId = professionalId.trim();
  if (!profId || candidateSlots.length === 0) return [];

  const others = allTurmas.filter(
    (t) => t.professionalId === profId && t.id !== options?.excludeTurmaId,
  );

  const conflicts: TurmaScheduleConflict[] = [];
  for (const candidateSlot of candidateSlots) {
    for (const other of others) {
      for (const existingSlot of other.schedules || []) {
        if (scheduleSlotsOverlap(candidateSlot, existingSlot)) {
          conflicts.push({
            turmaId: other.id,
            turmaName: other.name,
            existingSlot,
            candidateSlot,
          });
        }
      }
    }
  }
  return conflicts;
}

export function formatTurmaScheduleConflictMessage(conflicts: TurmaScheduleConflict[]): string {
  if (conflicts.length === 0) return '';
  const lines = conflicts.slice(0, 3).map((c) => {
    const day = WEEKDAY_LABELS[c.candidateSlot.weekday] || 'Dia';
    return `${day} ${c.candidateSlot.startTime}–${c.candidateSlot.endTime} conflita com "${c.turmaName}" (${c.existingSlot.startTime}–${c.existingSlot.endTime})`;
  });
  const suffix = conflicts.length > 3 ? `\n…e mais ${conflicts.length - 3} conflito(s).` : '';
  return `Este professor já possui aula/turma no mesmo horário:\n${lines.join('\n')}${suffix}`;
}

export function getProfessorScheduleConflictError(
  allTurmas: Pick<Turma, 'id' | 'name' | 'professionalId' | 'schedules'>[],
  professionalId: string | undefined,
  candidateSlots: TurmaScheduleSlot[],
  options?: { excludeTurmaId?: string },
): string | null {
  if (!professionalId?.trim() || candidateSlots.length === 0) return null;
  const conflicts = findProfessorTurmaScheduleConflicts(
    allTurmas,
    professionalId,
    candidateSlots,
    options,
  );
  return conflicts.length > 0 ? formatTurmaScheduleConflictMessage(conflicts) : null;
}

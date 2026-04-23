import { addDays, format } from 'date-fns';
import type { Turma, TurmaWeekday } from '@/types/turma';

const WEEKDAY_LABELS_PT: Record<TurmaWeekday, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

/** Parse yyyy-MM-dd as local noon to avoid DST edge cases. */
export function parseLocalYyyyMmDd(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Weekdays (0–Sun … 6–Sat) on which the turma has at least one scheduled slot. */
export function getTurmaScheduledWeekdays(turma: Pick<Turma, 'schedules'>): Set<number> {
  const s = new Set<number>();
  for (const slot of turma.schedules || []) {
    if (typeof slot.weekday === 'number' && slot.weekday >= 0 && slot.weekday <= 6) {
      s.add(slot.weekday);
    }
  }
  return s;
}

export function isClassDayForTurma(turma: Pick<Turma, 'schedules'>, yyyyMmDd: string): boolean {
  const dt = parseLocalYyyyMmDd(yyyyMmDd);
  if (!dt) return false;
  const weekdays = getTurmaScheduledWeekdays(turma);
  if (weekdays.size === 0) return false;
  return weekdays.has(dt.getDay());
}

/** O horário coincide com algum slot da turma no dia (weekday de yyyy-mm-dd). */
export function turmaScheduleMatchesTimeOnDate(
  turma: Pick<Turma, 'schedules'>,
  yyyyMmDd: string,
  startTime: string,
  endTime: string,
): boolean {
  const dt = parseLocalYyyyMmDd(yyyyMmDd);
  if (!dt) return false;
  const wd = dt.getDay();
  return (turma.schedules || []).some(
    (s) => s.weekday === wd && s.startTime === startTime && s.endTime === endTime,
  );
}

/** Human-readable list e.g. "Segunda, Quarta". */
export function formatTurmaClassWeekdaysShort(turma: Pick<Turma, 'schedules'>): string {
  const set = getTurmaScheduledWeekdays(turma);
  if (set.size === 0) return 'Nenhum dia cadastrado na grade';
  const order: TurmaWeekday[] = [1, 2, 3, 4, 5, 6, 0];
  const parts = order.filter((d) => set.has(d)).map((d) => WEEKDAY_LABELS_PT[d]);
  return parts.join(', ');
}

/**
 * Closest calendar day (by absolute distance) where the turma has class.
 * On ties, prefers the earlier date.
 */
export function findNearestClassDate(
  turma: Pick<Turma, 'schedules'>,
  anchorYyyyMmDd: string,
): string | null {
  const weekdays = getTurmaScheduledWeekdays(turma);
  if (weekdays.size === 0) return null;
  if (isClassDayForTurma(turma, anchorYyyyMmDd)) return anchorYyyyMmDd;
  const anchor = parseLocalYyyyMmDd(anchorYyyyMmDd);
  if (!anchor) return null;
  for (let delta = 1; delta <= 400; delta++) {
    const past = addDays(anchor, -delta);
    if (weekdays.has(past.getDay())) return format(past, 'yyyy-MM-dd');
    const future = addDays(anchor, delta);
    if (weekdays.has(future.getDay())) return format(future, 'yyyy-MM-dd');
  }
  return null;
}

/** Next or previous class day strictly before/after `fromYyyyMmDd` (not including same day). */
export function stepClassDate(
  turma: Pick<Turma, 'schedules'>,
  fromYyyyMmDd: string,
  direction: -1 | 1,
): string | null {
  const weekdays = getTurmaScheduledWeekdays(turma);
  if (weekdays.size === 0) return null;
  const from = parseLocalYyyyMmDd(fromYyyyMmDd);
  if (!from) return null;
  for (let i = 1; i <= 400; i++) {
    const d = addDays(from, direction * i);
    if (weekdays.has(d.getDay())) return format(d, 'yyyy-MM-dd');
  }
  return null;
}

/** Dias antes do vencimento para avisos e geração da próxima cobrança. */
export const TUITION_DUE_REMINDER_DAYS = 5;

/** @deprecated Use TUITION_DUE_REMINDER_DAYS */
export const INSTALLMENT_CREATE_LOOKAHEAD_DAYS = TUITION_DUE_REMINDER_DAYS;

function clampDueDay(dueDayOfMonth: number): number {
  return Math.min(Math.max(dueDayOfMonth, 1), 28);
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return startOfDay(x);
}

export function computePlanEndDate(startDateStr: string, planDurationMonths: number): Date {
  const start = new Date(startDateStr + 'T12:00:00');
  const months = Math.max(1, planDurationMonths);
  return new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
}

export function computePlanEndDateStr(startDateStr: string, planDurationMonths: number): string {
  const end = computePlanEndDate(startDateStr, planDurationMonths);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDueDateWithinPlan(dueDate: Date, planEndDateStr?: string | null): boolean {
  if (!planEndDateStr) return true;
  const end = startOfDay(new Date(planEndDateStr + 'T12:00:00'));
  return startOfDay(dueDate).getTime() <= end.getTime();
}

export function computeFirstDueDate(startDateStr: string, dueDayOfMonth: number): Date {
  const start = new Date(startDateStr + 'T12:00:00');
  const day = clampDueDay(dueDayOfMonth);
  return new Date(start.getFullYear(), start.getMonth(), day);
}

export function computeNextDueDate(
  fromDueDate: Date,
  billingCycleMonths: number,
  dueDayOfMonth: number,
): Date {
  const day = clampDueDay(dueDayOfMonth);
  const cycle = Math.max(1, billingCycleMonths);
  const d = startOfDay(fromDueDate);
  return new Date(d.getFullYear(), d.getMonth() + cycle, day);
}

export function dueDatesMatch(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** True se já é hora de gerar a cobrança com vencimento em `nextDueDate`. */
export function shouldCreateInstallmentWithDueDate(nextDueDate: Date, today = new Date()): boolean {
  const threshold = addDays(startOfDay(today), TUITION_DUE_REMINDER_DAYS);
  return startOfDay(nextDueDate).getTime() <= threshold.getTime();
}

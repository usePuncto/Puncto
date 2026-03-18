import { addDays, isSameDay, isBefore, isAfter, format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { WorkingHours } from '@/types/business';

const getDayKey = (date: Date) =>
  format(date, 'EEEE', { locale: enUS }).toLowerCase() as keyof WorkingHours;

export interface TimeBlock {
  id: string;
  start: Date;
  end: Date;
  reason: string;
  type: 'holiday' | 'closure' | 'break' | 'unavailable';
}

export interface Holiday {
  id: string;
  name: string;
  date: Date;
  recurring?: boolean; // Annual recurring holidays
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date, holidays: Holiday[]): boolean {
  return holidays.some((holiday) => {
    if (holiday.recurring) {
      // Check if it's the same month and day (annual recurring)
      return (
        date.getMonth() === holiday.date.getMonth() &&
        date.getDate() === holiday.date.getDate()
      );
    }
    return isSameDay(date, holiday.date);
  });
}

/**
 * Get working hours for a specific date (considering holidays and closures)
 */
export function getWorkingHoursForDate(
  date: Date,
  workingHours: WorkingHours,
  blocks: TimeBlock[] = [],
  holidays: Holiday[] = []
): { open: string; close: string; closed: boolean } | null {
  const dayOfWeek = getDayKey(date);
  const daySchedule = workingHours[dayOfWeek];

  // Check if it's a holiday
  if (isHoliday(date, holidays)) {
    return { open: '09:00', close: '18:00', closed: true };
  }

  // Check if there's a full-day block (closure)
  const hasFullDayBlock = blocks.some(
    (block) =>
      isSameDay(block.start, date) &&
      isSameDay(block.end, date) &&
      block.type === 'closure'
  );

  if (hasFullDayBlock || daySchedule.closed) {
    return { open: '09:00', close: '18:00', closed: true };
  }

  return {
    open: daySchedule.open,
    close: daySchedule.close,
    closed: false,
  };
}

/**
 * Get all time blocks for a date range
 */
export function getBlocksForDateRange(
  startDate: Date,
  endDate: Date,
  allBlocks: TimeBlock[]
): TimeBlock[] {
  return allBlocks.filter((block) => {
    return (
      (isSameDay(block.start, startDate) || isAfter(block.start, startDate)) &&
      (isSameDay(block.end, endDate) || isBefore(block.end, endDate))
    );
  });
}

/**
 * Calculate next available date with working hours
 */
export function getNextAvailableDate(
  startDate: Date,
  workingHours: WorkingHours,
  holidays: Holiday[] = [],
  maxDays: number = 60
): Date {
  let currentDate = startDate;
  let attempts = 0;

  while (attempts < maxDays) {
    const dayOfWeek = getDayKey(currentDate);
    const daySchedule = workingHours[dayOfWeek];

    if (
      !daySchedule.closed &&
      !isHoliday(currentDate, holidays) &&
      (isAfter(currentDate, startDate) || isSameDay(currentDate, startDate))
    ) {
      return currentDate;
    }

    currentDate = addDays(currentDate, 1);
    attempts++;
  }

  // Fallback: return max days ahead
  return addDays(startDate, maxDays);
}

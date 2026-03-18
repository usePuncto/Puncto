import { addMinutes, setHours, setMinutes, isBefore, isAfter, format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { fromZonedTime } from 'date-fns-tz/fromZonedTime';
import { formatInTimeZone } from 'date-fns-tz/formatInTimeZone';
import { WorkingHours } from '@/types/business';

// Working hours keys are in English (monday, tuesday, etc.) - use enUS locale for consistency
// Use business timezone so day-of-week is correct regardless of server timezone
const getDayKey = (date: Date, timeZone: string = 'UTC') =>
  formatInTimeZone(date, timeZone, 'EEEE', { locale: enUS }).toLowerCase() as keyof WorkingHours;

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AvailabilityFilters {
  professionalId?: string;
  serviceId?: string;
  locationId?: string;
  existingBookings?: Array<{ start: Date; end: Date }>;
  blocks?: Array<{ start: Date; end: Date; reason?: string }>;
  /** IANA timezone (e.g. America/Sao_Paulo) - slot times are interpreted in this zone */
  timeZone?: string;
}

/**
 * Calculate available time slots for a given date
 */
export function calculateAvailableSlots(
  date: Date,
  workingHours: WorkingHours,
  durationMinutes: number,
  bufferMinutes: number = 0,
  filters?: AvailabilityFilters
): TimeSlot[] {
  const tz = filters?.timeZone || 'UTC';
  const dayOfWeek = getDayKey(date, tz);
  const daySchedule = workingHours[dayOfWeek];

  if (!daySchedule || daySchedule.closed) {
    return [];
  }

  const slots: TimeSlot[] = [];
  const [openHour, openMinute] = (daySchedule.open || '09:00').split(':').map(Number);
  const [closeHour, closeMinute] = (daySchedule.close || '18:00').split(':').map(Number);

  // Extract date components in business timezone (server local timezone can differ)
  const dateStr = formatInTimeZone(date, tz, 'yyyy-MM-dd');
  const [y, m, d] = dateStr.split('-').map(Number);
  const year = y;
  const month = m - 1;
  const day = d;
  const dayStart = fromZonedTime(new Date(year, month, day, openHour, openMinute, 0), tz);
  const dayEnd = fromZonedTime(new Date(year, month, day, closeHour, closeMinute, 0), tz);

  // Get blocked times
  const blockedTimes: Array<{ start: Date; end: Date }> = [
    ...(filters?.existingBookings || []),
    ...(filters?.blocks || []),
  ];

  // Generate slots
  let currentTime = dayStart;
  const slotInterval = durationMinutes + bufferMinutes;

  while (currentTime < dayEnd) {
    const slotEnd = addMinutes(currentTime, durationMinutes);
    
    // Check if slot fits within working hours
    if (slotEnd <= dayEnd) {
      // Check if slot conflicts with existing bookings or blocks
      const isBlocked = blockedTimes.some((block) => {
        return (
          (currentTime >= block.start && currentTime < block.end) ||
          (slotEnd > block.start && slotEnd <= block.end) ||
          (currentTime <= block.start && slotEnd >= block.end)
        );
      });

      // Check if slot is in the past
      const isPast = isBefore(currentTime, new Date());

      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        available: !isBlocked && !isPast,
      });
    }

    currentTime = addMinutes(currentTime, slotInterval);
  }

  return slots;
}

/**
 * Format time slot for display
 */
export function formatTimeSlot(slot: TimeSlot): string {
  return format(slot.start, 'HH:mm');
}

/**
 * Check if a specific time slot is available
 */
export function isSlotAvailable(
  startTime: Date,
  durationMinutes: number,
  workingHours: WorkingHours,
  existingBookings: Array<{ start: Date; end: Date }> = [],
  blocks: Array<{ start: Date; end: Date }> = []
): boolean {
  const dayOfWeek = getDayKey(startTime);
  const daySchedule = workingHours[dayOfWeek];

  if (!daySchedule || daySchedule.closed) {
    return false;
  }

  const [openHour, openMinute] = daySchedule.open.split(':').map(Number);
  const [closeHour, closeMinute] = daySchedule.close.split(':').map(Number);

  const dayStart = setMinutes(setHours(startTime, openHour), openMinute);
  const dayEnd = setMinutes(setHours(startTime, closeHour), closeMinute);

  const slotEnd = addMinutes(startTime, durationMinutes);

  // Check if within working hours
  if (isBefore(startTime, dayStart) || isAfter(slotEnd, dayEnd)) {
    return false;
  }

  // Check if in the past
  if (isBefore(startTime, new Date())) {
    return false;
  }

  // Check conflicts
  const allBlocks = [...existingBookings, ...blocks];
  const hasConflict = allBlocks.some((block) => {
    return (
      (startTime >= block.start && startTime < block.end) ||
      (slotEnd > block.start && slotEnd <= block.end) ||
      (startTime <= block.start && slotEnd >= block.end)
    );
  });

  return !hasConflict;
}

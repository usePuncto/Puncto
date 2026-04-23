'use client';

import { useEffect, useState } from 'react';
import { Booking } from '@/types/booking';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  setHours,
  setMinutes,
  addMinutes,
} from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { WorkingHours } from '@/types/business';

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '14:00', closed: false },
  sunday: { open: '09:00', close: '14:00', closed: true },
};

const getDayKey = (date: Date) =>
  format(date, 'EEEE', { locale: enUS }).toLowerCase();

interface BookingCalendarProps {
  bookings: Booking[];
  workingHours?: WorkingHours;
  unavailabilityBlocks?: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
    allDay?: boolean;
  }>;
  onMonthChange?: (month: string) => void; // yyyy-MM
  onStatusChange: (bookingId: string, status: any) => void;
}

export function BookingCalendar({
  bookings,
  workingHours: wh = {},
  unavailabilityBlocks = [],
  onMonthChange,
  onStatusChange,
}: BookingCalendarProps) {
  const workingHours = { ...DEFAULT_WORKING_HOURS, ...wh };
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const monthKey = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    onMonthChange?.(monthKey);
  }, [monthKey, onMonthChange]);

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((booking) => {
      const bookingDate =
        booking.scheduledDateTime instanceof Date
          ? booking.scheduledDateTime
          : new Date(booking.scheduledDateTime as any);
      return isSameDay(bookingDate, day);
    });
  };

  const getScheduleForDay = (day: Date) => {
    const key = getDayKey(day);
    const schedule = workingHours[key];
    return schedule?.closed ? null : schedule;
  };

  const getBlocksForDay = (day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    return unavailabilityBlocks.filter((block) => block.date === dayKey);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  // Day view: time slots based on working hours
  const getTimeSlotsForDay = (day: Date) => {
    const schedule = getScheduleForDay(day);
    if (!schedule) return [];

    const [openH, openM] = schedule.open.split(':').map(Number);
    const [closeH, closeM] = schedule.close.split(':').map(Number);
    const start = setMinutes(setHours(day, openH), openM);
    const end = setMinutes(setHours(day, closeH), closeM);

    const slots: { time: Date; label: string }[] = [];
    let t = start;
    while (t < end) {
      slots.push({ time: new Date(t), label: format(t, 'HH:mm') });
      t = addMinutes(t, 30);
    }
    return slots;
  };

  const getBookingPosition = (
    startDate: Date,
    duration: number,
    dayStart: Date,
    dayEnd: Date,
    totalPx: number
  ) => {
    const totalMinutes = (dayEnd.getTime() - dayStart.getTime()) / 60000;
    const startOffset = Math.max(0, (startDate.getTime() - dayStart.getTime()) / 60000);
    const topPx = (startOffset / totalMinutes) * totalPx;
    const heightPx = Math.min(
      (duration / totalMinutes) * totalPx,
      totalPx - topPx
    );
    return { top: topPx, height: Math.max(20, heightPx) };
  };

  const DayView = ({ day }: { day: Date }) => {
    const schedule = getScheduleForDay(day);
    const dayBookings = getBookingsForDay(day);
    const dayBlocks = getBlocksForDay(day);

    if (!schedule) {
      return (
        <div className="py-12 text-center text-neutral-500">
          Fechado neste dia
        </div>
      );
    }

    const [openH, openM] = schedule.open.split(':').map(Number);
    const [closeH, closeM] = schedule.close.split(':').map(Number);
    const dayStart = setMinutes(setHours(day, openH), openM);
    const dayEnd = setMinutes(setHours(day, closeH), closeM);

    const slots = getTimeSlotsForDay(day);

    return (
      <div className="border-t border-neutral-200 mt-4 pt-4">
        <p className="text-sm text-neutral-600 mb-2">
          Horário de funcionamento: {schedule.open} — {schedule.close}
        </p>
        <div className="relative min-h-[320px]">
          {slots.map((slot) => (
            <div
              key={slot.label}
              className="flex border-b border-neutral-100 text-xs text-neutral-400 py-0.5"
              style={{ height: '40px' }}
            >
              <span className="w-12 shrink-0">{slot.label}</span>
              <div className="flex-1 relative" />
            </div>
          ))}
          {/* Unavailability + booking blocks */}
          <div className="absolute inset-0 left-12 top-0 pointer-events-none">
            {dayBlocks.map((block) => {
              const [startH, startM] = block.startTime.split(':').map(Number);
              const [endH, endM] = block.endTime.split(':').map(Number);
              const blockStart = block.allDay
                ? dayStart
                : setMinutes(setHours(day, startH), startM);
              const blockEnd = block.allDay
                ? dayEnd
                : setMinutes(setHours(day, endH), endM);
              const duration = Math.max(30, (blockEnd.getTime() - blockStart.getTime()) / 60000);
              const totalH = slots.length * 40;
              const pos = getBookingPosition(blockStart, duration, dayStart, dayEnd, totalH);
              return (
                <div
                  key={block.id}
                  className="absolute left-1 right-1 rounded border border-rose-400 bg-rose-100/80 px-2 py-1 text-xs text-rose-900 overflow-hidden"
                  style={{
                    top: `${pos.top}px`,
                    height: `${pos.height}px`,
                  }}
                >
                  <div className="font-semibold truncate">
                    {block.allDay ? 'Indisponível - dia inteiro' : `Indisponível ${block.startTime}-${block.endTime}`}
                  </div>
                  {block.reason && (
                    <div className="truncate text-[10px] opacity-90">{block.reason}</div>
                  )}
                </div>
              );
            })}
            {dayBookings
              .filter((b) => b.status !== 'cancelled')
              .map((booking) => {
                const start =
                  booking.scheduledDateTime instanceof Date
                    ? booking.scheduledDateTime
                    : new Date(booking.scheduledDateTime as any);
                if (!isSameDay(start, day)) return null;
                const totalH = slots.length * 40;
                const pos = getBookingPosition(
                  start,
                  (booking as any).durationMinutes || 60,
                  dayStart,
                  dayEnd,
                  totalH
                );
                return (
                  <div
                    key={booking.id}
                    className={`absolute left-1 right-1 rounded px-2 py-1 border text-xs overflow-hidden shadow-sm ${getStatusColor(
                      booking.status
                    )}`}
                    style={{
                      top: `${pos.top}px`,
                      height: `${pos.height}px`,
                    }}
                  >
                    <div className="font-medium truncate">
                      {format(start, 'HH:mm')} {booking.serviceName}
                    </div>
                    <div className="truncate text-[10px] opacity-90">
                      {booking.customerData?.firstName} {booking.customerData?.lastName}
                    </div>
                    {booking.professionalName && (
                      <div className="truncate text-[10px] opacity-75">
                        {booking.professionalName}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
            )
          }
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 sm:px-4 sm:py-2"
        >
          ←
        </button>
        <h2 className="text-base font-semibold capitalize sm:text-xl">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
            )
          }
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 sm:px-4 sm:py-2"
        >
          →
        </button>
      </div>

      <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[680px] grid-cols-7 gap-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-neutral-600 sm:text-sm"
          >
            {day}
          </div>
        ))}

        {days.map((day, idx) => {
          const dayBookings = getBookingsForDay(day);
          const dayBlocks = getBlocksForDay(day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const schedule = getScheduleForDay(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          return (
            <div
              key={idx}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`min-h-[90px] border rounded-lg p-1.5 cursor-pointer transition-colors sm:min-h-[100px] sm:p-2 ${
                isSelected
                  ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-1'
                  : 'border-neutral-200 hover:border-neutral-300'
              } ${!isCurrentMonth ? 'bg-neutral-50 opacity-50' : 'bg-white'}`}
            >
              <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
              {schedule && !schedule.closed && (
                <div className="text-[10px] text-neutral-400 mb-1">
                  {schedule.open}-{schedule.close}
                </div>
              )}
              {schedule?.closed && (
                <div className="text-[10px] text-neutral-400 mb-1">Fechado</div>
              )}
              <div className="space-y-1">
                {dayBlocks.slice(0, 1).map((block) => (
                  <div
                    key={block.id}
                    className="text-[10px] rounded border border-rose-300 bg-rose-50 px-1 py-0.5 text-rose-700"
                    title={block.reason || 'Indisponibilidade'}
                  >
                    {block.allDay ? 'Dia inteiro indisponível' : `Indisp. ${block.startTime}-${block.endTime}`}
                  </div>
                ))}
                {dayBookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className={`text-xs p-1 rounded border ${getStatusColor(
                      booking.status
                    )}`}
                    title={`${booking.serviceName} - ${booking.customerData?.firstName} ${booking.customerData?.lastName}${booking.professionalName ? ` (${booking.professionalName})` : ''}`}
                  >
                    <div className="truncate">
                      {format(
                        booking.scheduledDateTime instanceof Date
                          ? booking.scheduledDateTime
                          : new Date(booking.scheduledDateTime as any),
                        'HH:mm'
                      )}{' '}
                      {booking.serviceName}
                    </div>
                    <div className="truncate text-[10px] opacity-80">
                      {booking.customerData?.firstName} {booking.customerData?.lastName}
                    </div>
                    {booking.professionalName && (
                      <div className="truncate text-[10px] opacity-75">
                        {booking.professionalName}
                      </div>
                    )}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-neutral-500">
                    +{dayBookings.length - 3} mais
                  </div>
                )}
                {dayBlocks.length > 1 && (
                  <div className="text-[10px] text-rose-600">
                    +{dayBlocks.length - 1} bloqueio(s)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {selectedDay && (
        <DayView day={selectedDay} />
      )}
    </div>
  );
}

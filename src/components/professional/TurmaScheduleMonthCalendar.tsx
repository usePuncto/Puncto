'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Turma } from '@/types/turma';

type DayEntry = {
  turmaId: string;
  turmaName: string;
  startTime: string;
  endTime: string;
  studentsCount: number;
};

type Props = {
  turmas: Turma[];
  /** Mostrar filtro por turma quando há mais de uma */
  showTurmaFilter?: boolean;
};

export function TurmaScheduleMonthCalendar({ turmas, showTurmaFilter = true }: Props) {
  const [calendarMonth, setCalendarMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthAnchor = new Date(`${calendarMonth}-01T00:00:00`);
  const rollCallDays = useMemo(() => {
    const monthStart = startOfMonth(monthAnchor);
    const monthEnd = endOfMonth(monthAnchor);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { locale: ptBR }),
      end: endOfWeek(monthEnd, { locale: ptBR }),
    });
  }, [monthAnchor]);

  const entriesByDate = useMemo(() => {
    const entries = new Map<string, DayEntry[]>();
    for (const day of rollCallDays) {
      if (!isSameMonth(day, monthAnchor)) continue;
      const key = format(day, 'yyyy-MM-dd');
      const weekday = day.getDay();
      const dayEntries: DayEntry[] = [];
      for (const turma of turmas) {
        if (selectedTurmaId !== 'all' && turma.id !== selectedTurmaId) continue;
        for (const slot of turma.schedules || []) {
          if (slot.weekday === weekday) {
            dayEntries.push({
              turmaId: turma.id,
              turmaName: turma.name,
              startTime: slot.startTime,
              endTime: slot.endTime,
              studentsCount: turma.studentIds?.length || 0,
            });
          }
        }
      }
      dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
      entries.set(key, dayEntries);
    }
    return entries;
  }, [rollCallDays, monthAnchor, turmas, selectedTurmaId]);

  const selectedTurma =
    selectedTurmaId !== 'all' ? turmas.find((t) => t.id === selectedTurmaId) : undefined;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      {showTurmaFilter && turmas.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <label htmlFor="pro-cal-turma" className="text-sm text-neutral-600">
            Turma
          </label>
          <select
            id="pro-cal-turma"
            value={selectedTurmaId}
            onChange={(e) => {
              setSelectedTurmaId(e.target.value);
              setSelectedDay(null);
            }}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="all">Todas as minhas turmas</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const prev = addMonths(monthAnchor, -1);
            setCalendarMonth(format(prev, 'yyyy-MM'));
          }}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          ←
        </button>
        <h2 className="text-xl font-semibold">
          {format(monthAnchor, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button
          type="button"
          onClick={() => {
            const next = addMonths(monthAnchor, 1);
            setCalendarMonth(format(next, 'yyyy-MM'));
          }}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="py-2 text-center text-sm font-medium text-neutral-600">
            {day}
          </div>
        ))}

        {rollCallDays.map((day, idx) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEntries = entriesByDate.get(dayKey) || [];
          const isCurrentMonth = isSameMonth(day, monthAnchor);
          const isSelected = !!selectedDay && isSameDay(day, selectedDay);
          return (
            <div
              key={idx}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`min-h-[110px] cursor-pointer rounded-lg border p-2 transition-colors ${
                isSelected
                  ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-1'
                  : 'border-neutral-200 hover:border-neutral-300'
              } ${!isCurrentMonth ? 'bg-neutral-50 opacity-50' : 'bg-white'}`}
            >
              <div className="mb-1 text-sm font-medium">{format(day, 'd')}</div>
              <div className="space-y-1">
                {dayEntries.slice(0, 2).map((entry) => (
                  <div
                    key={`${entry.turmaId}-${entry.startTime}-${entry.endTime}`}
                    className="rounded border border-blue-200 bg-blue-50 px-1 py-0.5 text-[10px] text-blue-800"
                    title={`${entry.turmaName} (${entry.startTime}-${entry.endTime})`}
                  >
                    <div className="truncate font-medium">
                      {entry.startTime} {entry.turmaName}
                    </div>
                  </div>
                ))}
                {dayEntries.length > 2 && (
                  <div className="text-xs text-neutral-500">+{dayEntries.length - 2} mais</div>
                )}
                {dayEntries.length === 0 && isCurrentMonth && (
                  <div className="text-[10px] text-neutral-400">Sem turma</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 rounded-lg border border-neutral-200 p-4">
          <h3 className="font-medium text-neutral-900">
            Turmas em {format(selectedDay, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
          </h3>
          {selectedTurmaId !== 'all' && selectedTurma && (
            <p className="mt-1 text-sm text-neutral-600">
              Filtro ativo: <span className="font-medium">{selectedTurma.name}</span>
            </p>
          )}
          <div className="mt-2 space-y-2">
            {(entriesByDate.get(format(selectedDay, 'yyyy-MM-dd')) || []).length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhuma turma neste dia.</p>
            ) : (
              (entriesByDate.get(format(selectedDay, 'yyyy-MM-dd')) || []).map((entry) => (
                <div
                  key={`detail-${entry.turmaId}-${entry.startTime}-${entry.endTime}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-neutral-900">{entry.turmaName}</span>
                  <span className="text-neutral-600">
                    {entry.startTime}-{entry.endTime} • {entry.studentsCount} aluno
                    {entry.studentsCount === 1 ? '' : 's'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useBookings, useUpdateBooking } from '@/lib/queries/bookings';
import { useCustomers } from '@/lib/queries/customers';
import { useProfessionals } from '@/lib/queries/professionals';
import { useServices } from '@/lib/queries/services';
import { useAttendanceRollCallsByTurmaDate, useUpsertAttendanceRollCall } from '@/lib/queries/attendance';
import { useLessonRescheduleRequestsForTurmaDate } from '@/lib/queries/lessonReschedules';
import { buildRollCallRowsWithReplacementGuests } from '@/lib/education/rollCallStudents';
import { useTurmas } from '@/lib/queries/turmas';
import { BookingCalendar } from '@/components/admin/BookingCalendar';
import { RescheduleRequestsReviewPanel } from '@/components/education/RescheduleRequestsReviewPanel';
import { BookingStatus } from '@/types/booking';
import type { ServiceInventoryItem } from '@/types/business';
import type { InventoryItem } from '@/types/inventory';
import type { RollCallStatus } from '@/types/attendance';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  findNearestClassDate,
  formatTurmaClassWeekdaysShort,
  isClassDayForTurma,
  stepClassDate,
} from '@/lib/utils/turmaClassDays';

type UnavailabilityScope = 'business' | 'professional';

interface UnavailabilityItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  reason?: string;
}

type BookingInventoryInput = Record<string, number>;

export type AdminBookingsVariant = 'default' | 'preEnrollment' | 'rollCall';

interface AdminBookingsViewProps {
  /** When omitted, uses education → calendário de aulas, otherwise agendamentos. */
  variant?: AdminBookingsVariant;
}

export function AdminBookingsView({ variant: variantProp }: AdminBookingsViewProps) {
  const searchParams = useSearchParams();
  const rescheduleTabParam = searchParams.get('tab');
  const { business } = useBusiness();
  const variant: AdminBookingsVariant =
    variantProp ??
    (business?.industry === 'education' ? 'preEnrollment' : 'default');

  const isEducation = business?.industry === 'education';
  const isPreEnrollment = variant === 'preEnrollment';

  const [view, setView] = useState<'calendar' | 'list'>(
    variant === 'rollCall' ? 'list' : 'calendar',
  );
  const [preEnrollmentTab, setPreEnrollmentTab] = useState<'calendar' | 'reschedules'>('calendar');

  useEffect(() => {
    if (variant !== 'preEnrollment' || rescheduleTabParam !== 'reschedules') return;
    setPreEnrollmentTab('reschedules');
  }, [variant, rescheduleTabParam]);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showUnavailabilityModal, setShowUnavailabilityModal] = useState(false);
  const [scope, setScope] = useState<UnavailabilityScope>('business');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [blockDate, setBlockDate] = useState<string>('');
  const [blockStart, setBlockStart] = useState<string>('09:00');
  const [blockEnd, setBlockEnd] = useState<string>('18:00');
  const [allDay, setAllDay] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [blocksMonth, setBlocksMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [blockReason, setBlockReason] = useState<string>('');
  const [items, setItems] = useState<UnavailabilityItem[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const filters: Record<string, unknown> = {};
  if (statusFilter !== 'all') {
    filters.status = statusFilter;
  }

  const { data: bookings, isLoading } = useBookings(business?.id ?? '', filters);
  const { data: customers = [] } = useCustomers(business?.id ?? '');
  const { data: professionals = [] } = useProfessionals(business?.id ?? '', { active: true });
  const { data: services = [] } = useServices(business?.id ?? '');
  const { data: turmas = [] } = useTurmas(business?.id ?? '');
  const upsertRollCall = useUpsertAttendanceRollCall(business?.id ?? '');
  const updateBooking = useUpdateBooking(business?.id ?? '');
  const [selectedRollCallDay, setSelectedRollCallDay] = useState<Date | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('all');
  const [selectedRollCallTurmaId, setSelectedRollCallTurmaId] = useState<string | null>(null);
  /** Lista de chamada (variant rollCall): só dias em que a turma tem aula na grade. */
  const [rollCallListDate, setRollCallListDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryByBookingId, setInventoryByBookingId] = useState<Record<string, BookingInventoryInput>>({});
  const [inventoryErrorByBookingId, setInventoryErrorByBookingId] = useState<Record<string, string>>({});

  const selectedTurma = useMemo(
    () => turmas.find((turma) => turma.id === selectedTurmaId),
    [turmas, selectedTurmaId],
  );
  const selectedRollCallTurma = useMemo(
    () => turmas.find((turma) => turma.id === selectedRollCallTurmaId) || null,
    [turmas, selectedRollCallTurmaId],
  );
  const selectedTurmaStudentIds = useMemo(
    () => new Set(selectedTurma?.studentIds || []),
    [selectedTurma],
  );
  const rollCallDate =
    variant === 'rollCall'
      ? rollCallListDate
      : dateFilter || format(new Date(), 'yyyy-MM-dd');
  const { data: rollCallRecords = [] } = useAttendanceRollCallsByTurmaDate(
    business?.id ?? '',
    selectedRollCallTurma?.id ?? '',
    rollCallDate,
  );
  const rollCallStatusByStudentId = useMemo(() => {
    const m = new Map<string, RollCallStatus>();
    for (const rec of rollCallRecords) m.set(rec.studentId, rec.status);
    return m;
  }, [rollCallRecords]);

  const { data: rollCallDayRescheduleRequests = [] } = useLessonRescheduleRequestsForTurmaDate(
    business?.id ?? '',
    selectedRollCallTurma?.id ?? '',
    rollCallDate,
  );

  const filteredBookings =
    bookings?.filter((booking) => {
      if (dateFilter) {
        const bookingDate =
          booking.scheduledDateTime instanceof Date
            ? booking.scheduledDateTime
            : new Date(booking.scheduledDateTime as unknown as string | number);
        return format(bookingDate, 'yyyy-MM-dd') === dateFilter;
      }
      return true;
    }) || [];

  const filteredBookingsByTurma =
    variant === 'rollCall' && selectedTurmaId !== 'all'
      ? filteredBookings.filter((booking) =>
          booking.customerId ? selectedTurmaStudentIds.has(booking.customerId) : false,
        )
      : filteredBookings;

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );
  const inventoryItemById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems],
  );

  const resolveServiceInventoryItems = (booking: (typeof filteredBookingsByTurma)[number]) => {
    const service = serviceById.get(booking.serviceId);
    const persisted = booking.usedInventoryItems?.filter((item) => Number(item.quantity) > 0) ?? [];
    if (persisted.length > 0) {
      return persisted.map((item) => {
        const inventory = inventoryItemById.get(item.inventoryItemId);
        return {
          inventoryItemId: item.inventoryItemId,
          inventoryItemName: item.inventoryItemName || inventory?.name || 'Produto',
          quantity: Number(item.quantity) || 0,
          unit: item.unit || inventory?.unit || 'un',
        };
      });
    }

    const serviceInventory = ((service?.inventoryItems ?? []) as ServiceInventoryItem[]).filter(
      (item) => Number(item.quantity) > 0,
    );
    return serviceInventory.map((item) => {
      const inventory = inventoryItemById.get(item.inventoryItemId);
      return {
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.inventoryItemName || inventory?.name || 'Produto',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || inventory?.unit || 'un',
      };
    });
  };

  const updateBookingInventoryQuantity = (
    bookingId: string,
    inventoryItemId: string,
    quantity: number,
  ) => {
    setInventoryByBookingId((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || {}),
        [inventoryItemId]: Number.isFinite(quantity) ? Math.max(0, quantity) : 0,
      },
    }));
    setInventoryErrorByBookingId((prev) => {
      if (!prev[bookingId]) return prev;
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });
  };

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    const booking = filteredBookingsByTurma.find((item) => item.id === bookingId);
    if (!booking) return;

    if (newStatus !== 'completed' || booking.status === 'completed') {
      await updateBooking.mutateAsync({
        bookingId,
        updates: { status: newStatus },
      });
      return;
    }

    const baseInventoryItems = resolveServiceInventoryItems(booking);
    if (baseInventoryItems.length === 0) {
      await updateBooking.mutateAsync({
        bookingId,
        updates: { status: newStatus },
      });
      return;
    }

    const selectedQuantities = inventoryByBookingId[booking.id] || {};
    const usedInventoryItems = baseInventoryItems
      .map((item) => ({
        ...item,
        quantity:
          selectedQuantities[item.inventoryItemId] !== undefined
            ? Number(selectedQuantities[item.inventoryItemId]) || 0
            : item.quantity,
      }))
      .filter((item) => item.quantity > 0);

    if (usedInventoryItems.length === 0) {
      setInventoryErrorByBookingId((prev) => ({
        ...prev,
        [booking.id]: 'Informe ao menos um insumo utilizado para concluir.',
      }));
      return;
    }

    for (const item of usedInventoryItems) {
      const inventory = inventoryItemById.get(item.inventoryItemId);
      if (!inventory) {
        setInventoryErrorByBookingId((prev) => ({
          ...prev,
          [booking.id]: `Insumo "${item.inventoryItemName}" não encontrado no estoque.`,
        }));
        return;
      }
      if (item.quantity > inventory.currentStock) {
        setInventoryErrorByBookingId((prev) => ({
          ...prev,
          [booking.id]: `Estoque insuficiente para "${item.inventoryItemName}". Disponível: ${inventory.currentStock} ${inventory.unit}.`,
        }));
        return;
      }
    }

    try {
      for (const item of usedInventoryItems) {
        const response = await fetch('/api/inventory/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business?.id,
            movement: {
              itemId: item.inventoryItemId,
              type: 'out',
              quantity: item.quantity,
              reason: `Consumo no atendimento #${booking.id}`,
              orderId: booking.id,
              createdBy: 'admin-bookings',
            },
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Falha ao baixar insumos do estoque.');
        }
      }

      await updateBooking.mutateAsync({
        bookingId,
        updates: {
          status: newStatus,
          usedInventoryItems,
          inventoryDeductedAt: new Date(),
        },
      });

      setInventoryItems((prev) =>
        prev.map((entry) => {
          const used = usedInventoryItems.find((item) => item.inventoryItemId === entry.id);
          if (!used) return entry;
          return {
            ...entry,
            currentStock: Math.max(0, entry.currentStock - used.quantity),
          };
        }),
      );
      setInventoryErrorByBookingId((prev) => {
        if (!prev[booking.id]) return prev;
        const next = { ...prev };
        delete next[booking.id];
        return next;
      });
    } catch (error) {
      setInventoryErrorByBookingId((prev) => ({
        ...prev,
        [booking.id]:
          error instanceof Error ? error.message : 'Erro ao registrar consumo de insumos.',
      }));
    }
  };

  const currentMonth = blocksMonth;
  const monthDate = new Date(`${currentMonth}-01T00:00:00`);
  const currentMonthLabel = format(monthDate, "MMMM 'de' yyyy", { locale: ptBR });

  const rollCallCalendarMonth = new Date(`${calendarMonth}-01T00:00:00`);
  const rollCallDays = useMemo(() => {
    const monthStart = startOfMonth(rollCallCalendarMonth);
    const monthEnd = endOfMonth(rollCallCalendarMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { locale: ptBR }),
      end: endOfWeek(monthEnd, { locale: ptBR }),
    });
  }, [rollCallCalendarMonth]);

  const rollCallEntriesByDate = useMemo(() => {
    const entries = new Map<string, { turmaId: string; turmaName: string; startTime: string; endTime: string; studentsCount: number }[]>();
    for (const day of rollCallDays) {
      if (!isSameMonth(day, rollCallCalendarMonth)) continue;
      const key = format(day, 'yyyy-MM-dd');
      const weekday = day.getDay();
      const dayEntries: { turmaId: string; turmaName: string; startTime: string; endTime: string; studentsCount: number }[] = [];
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
  }, [rollCallDays, rollCallCalendarMonth, turmas, selectedTurmaId]);

  const navigateMonth = (direction: -1 | 1) => {
    const nextMonth = addMonths(monthDate, direction);
    setBlocksMonth(format(nextMonth, 'yyyy-MM'));
  };

  const loadUnavailability = async () => {
    if (!business?.id) return;
    if (scope === 'professional' && !selectedProfessionalId) {
      setItems([]);
      return;
    }
    setLoadingBlocks(true);
    setBlockError(null);
    try {
      const params = new URLSearchParams({
        businessId: business.id,
        scope,
        month: currentMonth,
      });
      if (scope === 'professional') {
        params.set('professionalId', selectedProfessionalId);
      }
      const res = await fetch(`/api/unavailability?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao carregar indisponibilidades');
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : 'Erro ao carregar indisponibilidades');
      setItems([]);
    } finally {
      setLoadingBlocks(false);
    }
  };

  useEffect(() => {
    loadUnavailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, scope, selectedProfessionalId, currentMonth]);

  useEffect(() => {
    if (variant !== 'rollCall') return;
    if (selectedRollCallTurmaId) return;
    if (turmas.length === 0) return;
    setSelectedRollCallTurmaId(turmas[0]?.id || null);
  }, [variant, turmas, selectedRollCallTurmaId]);

  useEffect(() => {
    if (variant !== 'rollCall' || !selectedRollCallTurmaId) return;
    const turma = turmas.find((t) => t.id === selectedRollCallTurmaId);
    if (!turma?.schedules?.length) return;
    setRollCallListDate((prev) =>
      isClassDayForTurma(turma, prev) ? prev : findNearestClassDate(turma, prev) || prev,
    );
  }, [variant, selectedRollCallTurmaId, turmas]);

  useEffect(() => {
    const loadInventory = async () => {
      if (!business?.id) return;
      try {
        const response = await fetch(`/api/inventory?businessId=${business.id}`);
        const data = await response.json();
        setInventoryItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        setInventoryItems([]);
      }
    };
    loadInventory();
  }, [business?.id]);

  const handleAddUnavailability = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUnavailability(false);
  };

  const createUnavailability = async (forceAllDay: boolean) => {
    if (!business?.id) return;
    if (!blockDate) {
      setBlockError('Data é obrigatória.');
      return;
    }
    if (scope === 'professional' && !selectedProfessionalId) {
      setBlockError('Selecione um profissional.');
      return;
    }
    const finalAllDay = forceAllDay || allDay;
    const finalStart = finalAllDay ? '00:00' : blockStart;
    const finalEnd = finalAllDay ? '23:59' : blockEnd;
    if (!finalAllDay && finalStart >= finalEnd) {
      setBlockError('Horário inicial precisa ser menor que o horário final.');
      return;
    }

    setSavingBlock(true);
    setBlockError(null);
    try {
      const res = await fetch('/api/unavailability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          scope,
          professionalId: scope === 'professional' ? selectedProfessionalId : undefined,
          date: blockDate,
          startTime: finalStart,
          endTime: finalEnd,
          allDay: finalAllDay,
          reason: blockReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar indisponibilidade');
      }
      setBlockReason('');
      await loadUnavailability();
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : 'Erro ao salvar indisponibilidade');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteUnavailability = async (itemId: string) => {
    if (!business?.id) return;
    setBlockError(null);
    try {
      const res = await fetch('/api/unavailability', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          scope,
          professionalId: scope === 'professional' ? selectedProfessionalId : undefined,
          itemId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao remover indisponibilidade');
      }
      await loadUnavailability();
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : 'Erro ao remover indisponibilidade');
    }
  };

  const pageTitle =
    variant === 'rollCall'
      ? 'Lista de chamada'
      : variant === 'preEnrollment'
        ? 'Calendário de aulas'
        : 'Agendamentos';

  const pageSubtitle =
    variant === 'rollCall'
      ? 'Chamada por turma: use apenas dias em que a turma tem aula na grade (inclui datas passadas para consulta ou correção).'
      : variant === 'preEnrollment'
        ? 'Veja as aulas previstas no mês e gerencie remarcações de aulas experimentais.'
        : 'Gerencie todos os agendamentos';

  const showTurmaMonthCalendar =
    (variant === 'rollCall' && view === 'calendar') ||
    (isPreEnrollment && preEnrollmentTab === 'calendar');
  const showDefaultBookingCalendar =
    !isPreEnrollment && view === 'calendar' && variant !== 'rollCall';
  const showRollCallListPanel = variant === 'rollCall' && view === 'list';
  const showRescheduleReviewPanel = isPreEnrollment && preEnrollmentTab === 'reschedules';
  const showBookingsDataTable =
    variant === 'default' && view === 'list';

  const colPerson = isEducation ? 'Aluno' : 'Cliente';
  const colService = isEducation ? 'Aula' : 'Serviço';
  const emptyListMessage =
    variant === 'rollCall'
      ? 'Nenhum registro na lista de chamada'
      : 'Nenhum agendamento encontrado';

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const selectedRollCallStudents = useMemo(() => {
    if (!selectedRollCallTurma) return [];
    return selectedRollCallTurma.studentIds
      .map((studentId) => customerById.get(studentId))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [customerById, selectedRollCallTurma]);

  const rollCallDisplayRows = useMemo(() => {
    if (!selectedRollCallTurma) return [];
    return buildRollCallRowsWithReplacementGuests(
      selectedRollCallTurma,
      rollCallDate,
      selectedRollCallStudents,
      rollCallDayRescheduleRequests,
      customerById,
    );
  }, [
    selectedRollCallTurma,
    rollCallDate,
    selectedRollCallStudents,
    rollCallDayRescheduleRequests,
    customerById,
  ]);

  const markRollCall = async (studentId: string, status: RollCallStatus) => {
    if (!selectedRollCallTurma) return;
    await upsertRollCall.mutateAsync({
      turmaId: selectedRollCallTurma.id,
      studentId,
      date: rollCallDate,
      status,
    });
  };

  const turmaScheduleCalendar = (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const prev = addMonths(rollCallCalendarMonth, -1);
            setCalendarMonth(format(prev, 'yyyy-MM'));
          }}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          ←
        </button>
        <h2 className="text-xl font-semibold">
          {format(rollCallCalendarMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button
          type="button"
          onClick={() => {
            const next = addMonths(rollCallCalendarMonth, 1);
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
          const dayEntries = rollCallEntriesByDate.get(dayKey) || [];
          const isCurrentMonth = isSameMonth(day, rollCallCalendarMonth);
          const isSelected = !!selectedRollCallDay && isSameDay(day, selectedRollCallDay);
          return (
            <div
              key={idx}
              onClick={() => setSelectedRollCallDay(isSelected ? null : day)}
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

      {selectedRollCallDay && (
        <div className="mt-4 rounded-lg border border-neutral-200 p-4">
          <h3 className="font-medium text-neutral-900">
            Turmas em {format(selectedRollCallDay, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
          </h3>
          {selectedTurmaId !== 'all' && selectedTurma && (
            <p className="mt-1 text-sm text-neutral-600">
              Filtro ativo: <span className="font-medium">{selectedTurma.name}</span>
            </p>
          )}
          <div className="mt-2 space-y-2">
            {(rollCallEntriesByDate.get(format(selectedRollCallDay, 'yyyy-MM-dd')) || []).length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhuma turma neste dia.</p>
            ) : (
              (rollCallEntriesByDate.get(format(selectedRollCallDay, 'yyyy-MM-dd')) || []).map((entry) => (
                <div
                  key={`detail-${entry.turmaId}-${entry.startTime}-${entry.endTime}`}
                  className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm"
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

  if (!business?.id || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{pageTitle}</h1>
          <p className="mt-2 text-neutral-600">{pageSubtitle}</p>
        </div>

        {!isPreEnrollment && (
          <div className="flex flex-wrap items-center gap-4">
          {variant === 'rollCall' && (
            <select
              value={selectedTurmaId}
              onChange={(e) => {
                setSelectedTurmaId(e.target.value);
                setSelectedRollCallDay(null);
              }}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="all">Todas as turmas</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.name}
                </option>
              ))}
            </select>
          )}
          {variant !== 'rollCall' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
                <option value="no_show">Não compareceu</option>
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    className="text-sm text-neutral-600 hover:text-neutral-900"
                  >
                    Todas
                  </button>
                )}
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`rounded-lg px-4 py-2 text-sm ${
                view === 'calendar' ? 'bg-neutral-900 text-white' : 'border'
              }`}
            >
              Calendário
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-lg px-4 py-2 text-sm ${
                view === 'list' ? 'bg-neutral-900 text-white' : 'border'
              }`}
            >
              Lista
            </button>
          </div>
          </div>
        )}
      </div>

      {isPreEnrollment && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreEnrollmentTab('calendar')}
                className={`rounded-lg px-4 py-2 text-sm ${
                  preEnrollmentTab === 'calendar' ? 'bg-neutral-900 text-white' : 'border border-neutral-300'
                }`}
              >
                Calendário
              </button>
              <button
                type="button"
                onClick={() => setPreEnrollmentTab('reschedules')}
                className={`rounded-lg px-4 py-2 text-sm ${
                  preEnrollmentTab === 'reschedules' ? 'bg-neutral-900 text-white' : 'border border-neutral-300'
                }`}
              >
                Remarcações
              </button>
            </div>
            {preEnrollmentTab === 'calendar' && (
              <select
                value={selectedTurmaId}
                onChange={(e) => {
                  setSelectedTurmaId(e.target.value);
                  setSelectedRollCallDay(null);
                }}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="all">Todas as turmas</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {preEnrollmentTab === 'reschedules' && (
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
                <option value="no_show">Não compareceu</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    className="text-sm text-neutral-600 hover:text-neutral-900"
                  >
                    Todas
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showDefaultBookingCalendar && (
        <div className="space-y-4">
          <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setBlocksMonth(calendarMonth);
                    setShowUnavailabilityModal(true);
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Gerenciar indisponibilidades
                </button>
              </div>

              <BookingCalendar
                bookings={filteredBookings}
                workingHours={business?.settings?.workingHours}
                unavailabilityBlocks={items}
                onMonthChange={(month) => setCalendarMonth(month)}
                onStatusChange={handleStatusChange}
              />
          </>

          {showUnavailabilityModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900">
                      Indisponibilidade (mês específico)
                    </h3>
                    <p className="mt-1 text-xs text-neutral-600">
                      Defina dias e horários em que não haverá atendimento.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUnavailabilityModal(false)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Fechar
                  </button>
                </div>

                <form onSubmit={handleAddUnavailability} className="grid grid-cols-1 gap-3 md:grid-cols-6">
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as UnavailabilityScope)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  >
                    <option value="business">Estabelecimento</option>
                    <option value="professional">Profissional</option>
                  </select>

                  <select
                    value={selectedProfessionalId}
                    onChange={(e) => setSelectedProfessionalId(e.target.value)}
                    disabled={scope !== 'professional'}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
                  >
                    <option value="">Selecione o profissional</option>
                    {professionals.map((pro) => (
                      <option key={pro.id} value={pro.id}>
                        {pro.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    required
                  />
                  <input
                    type="time"
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    disabled={allDay}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
                    required
                  />
                  <input
                    type="time"
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    disabled={allDay}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
                    required
                  />
                  <button
                    type="submit"
                    disabled={savingBlock}
                    className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {savingBlock ? 'Salvando...' : 'Adicionar'}
                  </button>
                  <button
                    type="button"
                    disabled={savingBlock || !blockDate}
                    onClick={() => createUnavailability(true)}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Bloquear dia inteiro
                  </button>

                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm md:col-span-6"
                  />
                  <label className="flex items-center gap-2 text-sm text-neutral-700 md:col-span-6">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                      className="rounded border-neutral-300"
                    />
                    Marcar como dia inteiro
                  </label>
                </form>

                {blockError && <p className="mt-3 text-sm text-red-600">{blockError}</p>}

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-neutral-600">
                      Bloqueios do mês {currentMonthLabel}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigateMonth(-1)}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                      >
                        Mês anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateMonth(1)}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                      >
                        Próximo mês
                      </button>
                    </div>
                  </div>
                  {loadingBlocks ? (
                    <p className="mt-2 text-sm text-neutral-500">Carregando...</p>
                  ) : items.length === 0 ? (
                    <p className="mt-2 text-sm text-neutral-500">Nenhum bloqueio cadastrado.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {items
                        .slice()
                        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2"
                          >
                            <div className="text-sm text-neutral-700">
                              <span className="font-medium">{item.date}</span>{' '}
                              {item.allDay ? 'Dia inteiro' : `${item.startTime} - ${item.endTime}`}
                              {item.reason ? ` - ${item.reason}` : ''}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteUnavailability(item.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showTurmaMonthCalendar && <div className="space-y-4">{turmaScheduleCalendar}</div>}

      {showRollCallListPanel && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h3 className="font-medium text-neutral-900">Turmas</h3>
              <p className="text-xs text-neutral-500">Selecione uma turma para fazer a chamada.</p>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-2">
              {turmas.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500">Nenhuma turma cadastrada.</p>
              ) : (
                turmas.map((turma) => {
                  const selected = turma.id === selectedRollCallTurmaId;
                  return (
                    <button
                      key={turma.id}
                      type="button"
                      onClick={() => setSelectedRollCallTurmaId(turma.id)}
                      className={`mb-2 w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="text-sm font-medium">{turma.name}</div>
                      <div className={`text-xs ${selected ? 'text-neutral-200' : 'text-neutral-500'}`}>
                        {turma.studentIds.length} aluno{turma.studentIds.length === 1 ? '' : 's'}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white lg:col-span-2">
            <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-neutral-900">
                  {selectedRollCallTurma ? `Chamada - ${selectedRollCallTurma.name}` : 'Selecione uma turma'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Data da chamada: {format(new Date(`${rollCallDate}T12:00:00`), 'dd/MM/yyyy')}
                </p>
                {selectedRollCallTurma && selectedRollCallTurma.schedules?.length ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Dias com aula nesta turma: {formatTurmaClassWeekdaysShort(selectedRollCallTurma)}
                  </p>
                ) : null}
              </div>
              {selectedRollCallTurma && selectedRollCallTurma.schedules?.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = stepClassDate(selectedRollCallTurma, rollCallListDate, -1);
                      if (prev) setRollCallListDate(prev);
                    }}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    Dia de aula anterior
                  </button>
                  <input
                    type="date"
                    value={rollCallListDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v || !selectedRollCallTurma) return;
                      if (isClassDayForTurma(selectedRollCallTurma, v)) {
                        setRollCallListDate(v);
                      }
                    }}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = stepClassDate(selectedRollCallTurma, rollCallListDate, 1);
                      if (next) setRollCallListDate(next);
                    }}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    Próximo dia de aula
                  </button>
                </div>
              ) : null}
            </div>

            {!selectedRollCallTurma ? (
              <div className="p-8 text-center text-neutral-500">Escolha uma turma para iniciar a chamada.</div>
            ) : !selectedRollCallTurma.schedules?.length ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Esta turma não tem dias e horários cadastrados. Defina a grade em{' '}
                <span className="font-medium text-neutral-700">Turmas</span> para habilitar a chamada.
              </div>
            ) : rollCallDisplayRows.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                Esta turma ainda não possui alunos vinculados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">Aluno</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">Status da chamada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {rollCallDisplayRows.map(({ student, isReplacementGuest }) => {
                      const status = rollCallStatusByStudentId.get(student.id) || 'pending';
                      const statusButton = (value: RollCallStatus, label: string, activeClass: string) => (
                        <button
                          type="button"
                          onClick={() => markRollCall(student.id, value)}
                          disabled={upsertRollCall.isPending}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            status === value ? activeClass : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {label}
                        </button>
                      );

                      return (
                        <tr key={student.id}>
                          <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                            <span>
                              {student.firstName} {student.lastName}
                            </span>
                            {isReplacementGuest && (
                              <span className="ml-2 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                                Remarcação
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {statusButton('present', 'Presente', 'border-green-300 bg-green-100 text-green-800')}
                              {statusButton('absent', 'Falta', 'border-red-300 bg-red-100 text-red-800')}
                              {statusButton('justified', 'Justificada', 'border-blue-300 bg-blue-100 text-blue-800')}
                              {statusButton('pending', 'Pendente', 'border-yellow-300 bg-yellow-100 text-yellow-800')}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showRescheduleReviewPanel && (
        <RescheduleRequestsReviewPanel
          businessId={business.id}
          title="Remarcações de faltas"
          description="Aprove ou reprovar solicitações enviadas pelos alunos."
        />
      )}

      {showBookingsDataTable && (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                    {colPerson}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                    {colService}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                    Profissional
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                    Insumos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredBookingsByTurma.map((booking) => {
                  const bookingDate =
                    booking.scheduledDateTime instanceof Date
                      ? booking.scheduledDateTime
                      : new Date(booking.scheduledDateTime as unknown as string | number);
                  const customerName =
                    `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim() ||
                    '—';
                  const rowInventoryItems = resolveServiceInventoryItems(booking);
                  const selectedQuantities = inventoryByBookingId[booking.id] || {};
                  const isCompleted = booking.status === 'completed';

                  return (
                    <tr key={booking.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm">
                        {booking.customerId ? (
                          <Link
                            href={`/tenant/admin/customers?customerId=${booking.customerId}`}
                            className="font-medium text-neutral-900 hover:underline"
                          >
                            {customerName}
                          </Link>
                        ) : (
                          customerName
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{booking.serviceName}</td>
                      <td className="px-6 py-4 text-sm">
                        {booking.professionalId ? (
                          <Link
                            href={`/tenant/admin/professionals/${booking.professionalId}/bookings`}
                            className="font-medium text-neutral-900 hover:underline"
                          >
                            {booking.professionalName}
                          </Link>
                        ) : (
                          booking.professionalName
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {format(bookingDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {rowInventoryItems.length === 0 ? (
                          <span className="text-neutral-400">Sem insumos</span>
                        ) : (
                          <div className="space-y-2">
                            {rowInventoryItems.map((item) => {
                              const currentValue =
                                selectedQuantities[item.inventoryItemId] !== undefined
                                  ? selectedQuantities[item.inventoryItemId]
                                  : item.quantity;
                              return (
                                <div
                                  key={`${booking.id}-${item.inventoryItemId}`}
                                  className="flex items-center gap-2"
                                >
                                  <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">
                                    {item.inventoryItemName}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={currentValue}
                                    onChange={(e) =>
                                      updateBookingInventoryQuantity(
                                        booking.id,
                                        item.inventoryItemId,
                                        Number(e.target.value),
                                      )
                                    }
                                    disabled={isCompleted}
                                    className="w-20 rounded border border-neutral-300 px-2 py-1 text-xs disabled:bg-neutral-100"
                                  />
                                  <span className="w-12 text-xs text-neutral-500">{item.unit}</span>
                                </div>
                              );
                            })}
                            {inventoryErrorByBookingId[booking.id] && (
                              <p className="text-xs text-red-600">
                                {inventoryErrorByBookingId[booking.id]}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : booking.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : booking.status === 'no_show'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {booking.status === 'confirmed' && 'Confirmado'}
                          {booking.status === 'completed' && 'Concluído'}
                          {booking.status === 'cancelled' && 'Cancelado'}
                          {booking.status === 'no_show' && 'Não compareceu'}
                          {booking.status === 'pending' && 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          value={booking.status}
                          onChange={(e) => handleStatusChange(booking.id, e.target.value as BookingStatus)}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        >
                          <option value="pending">Pendente</option>
                          <option value="confirmed">Confirmar</option>
                          <option value="completed">Concluir</option>
                          <option value="cancelled">Cancelar</option>
                          <option value="no_show">Não compareceu</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredBookingsByTurma.length === 0 && (
              <div className="p-8 text-center text-neutral-500">{emptyListMessage}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

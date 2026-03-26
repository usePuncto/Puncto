'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useBookings, useUpdateBooking } from '@/lib/queries/bookings';
import { useProfessionals } from '@/lib/queries/professionals';
import { BookingCalendar } from '@/components/admin/BookingCalendar';
import { BookingStatus } from '@/types/booking';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type UnavailabilityScope = 'business' | 'professional';

interface UnavailabilityItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  reason?: string;
}

export default function AdminBookingsPage() {
  const { business } = useBusiness();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
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

  const filters: any = {};
  if (statusFilter !== 'all') {
    filters.status = statusFilter;
  }

  const { data: bookings, isLoading } = useBookings(business.id, filters);
  const { data: professionals = [] } = useProfessionals(business.id, { active: true });
  const updateBooking = useUpdateBooking(business.id);

  const filteredBookings = bookings?.filter((booking) => {
    if (dateFilter) {
      const bookingDate = booking.scheduledDateTime instanceof Date
        ? booking.scheduledDateTime
        : new Date(booking.scheduledDateTime as any);
      return format(bookingDate, 'yyyy-MM-dd') === dateFilter;
    }
    return true;
  }) || [];

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    await updateBooking.mutateAsync({
      bookingId,
      updates: { status: newStatus },
    });
  };

  const currentMonth = blocksMonth;
  const monthDate = new Date(`${currentMonth}-01T00:00:00`);
  const currentMonthLabel = format(monthDate, "MMMM 'de' yyyy", { locale: ptBR });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Agendamentos</h1>
          <p className="text-neutral-600 mt-2">Gerencie todos os agendamentos</p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
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

          <div className="flex gap-2">
            <button
              onClick={() => setView('calendar')}
              className={`rounded-lg px-4 py-2 text-sm ${
                view === 'calendar' ? 'bg-neutral-900 text-white' : 'border'
              }`}
            >
              Calendário
            </button>
            <button
              onClick={() => setView('list')}
              className={`rounded-lg px-4 py-2 text-sm ${
                view === 'list' ? 'bg-neutral-900 text-white' : 'border'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="space-y-4">
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
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Serviço</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Profissional</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Data/Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredBookings.map((booking) => {
                  const bookingDate = booking.scheduledDateTime instanceof Date
                    ? booking.scheduledDateTime
                    : new Date(booking.scheduledDateTime as any);
                  const customerName = `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim() || '—';

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
            {filteredBookings.length === 0 && (
              <div className="p-8 text-center text-neutral-500">
                Nenhum agendamento encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

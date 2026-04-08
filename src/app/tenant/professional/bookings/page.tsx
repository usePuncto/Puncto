'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { useBookings, useUpdateBooking } from '@/lib/queries/bookings';
import { BookingCalendar } from '@/components/admin/BookingCalendar';
import { BookingStatus } from '@/types/booking';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProfessionalBookingsPage() {
  const router = useRouter();
  const { business } = useBusiness();
  const { professional } = useProfessional();

  useEffect(() => {
    if (business?.industry === 'education') {
      router.replace('/tenant/professional');
    }
  }, [business?.industry, router]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const { data: bookings, isLoading } = useBookings(business?.id ?? '', {
    professionalId: professional?.id,
  });
  const updateBooking = useUpdateBooking(business?.id ?? '');

  const filteredBookings =
    bookings?.filter((booking) => {
      const passesDate =
        !dateFilter ||
        format(
          booking.scheduledDateTime instanceof Date
            ? booking.scheduledDateTime
            : new Date(booking.scheduledDateTime as any),
          'yyyy-MM-dd'
        ) === dateFilter;
      const passesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return passesDate && passesStatus;
    }) ?? [];

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    await updateBooking.mutateAsync({
      bookingId,
      updates: { status: newStatus },
    });
  };

  if (!professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Carregando...</p>
      </div>
    );
  }

  if (business?.industry === 'education') {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  const isClinic = business?.industry === 'clinic';
  const clientLabel = isClinic ? 'Paciente' : 'Cliente';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Meus agendamentos</h1>
        <p className="text-neutral-600 mt-1">
          Gerencie seus agendamentos – confirme, conclua ou cancele
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
        </div>
      ) : view === 'calendar' ? (
        <BookingCalendar
          bookings={filteredBookings}
          workingHours={professional.workingHours ?? business?.settings?.workingHours}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    {clientLabel}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Serviço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredBookings.map((booking) => {
                  const bookingDate =
                    booking.scheduledDateTime instanceof Date
                      ? booking.scheduledDateTime
                      : new Date(booking.scheduledDateTime as any);
                  const customerName = `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim() || '—';

                  return (
                    <tr key={booking.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                        {customerName}
                      </td>
                      <td className="px-6 py-4 text-sm">{booking.serviceName}</td>
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
                          onChange={(e) =>
                            handleStatusChange(booking.id, e.target.value as BookingStatus)
                          }
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

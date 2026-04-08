'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBookings, useUpdateBooking } from '@/lib/queries/bookings';
import { useProfessionals } from '@/lib/queries/professionals';
import { useTurmas } from '@/lib/queries/turmas';
import { BookingCalendar } from '@/components/admin/BookingCalendar';
import { TurmaScheduleMonthCalendar } from '@/components/professional/TurmaScheduleMonthCalendar';
import { BookingStatus } from '@/types/booking';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotificationsPreview } from '@/components/notifications/NotificationsPreview';

export default function ProfessionalDashboardPage() {
  const { business } = useBusiness();
  const { professional, isOwnerProfessional } = useProfessional();
  const { user } = useAuth();
  const isEducation = business?.industry === 'education';

  const { data: allProfessionals } = useProfessionals(business?.id ?? '', { active: true });
  const [selectedProId, setSelectedProId] = useState<string | null>(null);

  const viewingProfessional =
    selectedProId && allProfessionals?.find((p) => p.id === selectedProId)
      ? allProfessionals.find((p) => p.id === selectedProId)!
      : professional;

  const { data: turmas = [] } = useTurmas(isEducation ? (business?.id ?? '') : '');
  const teacherTurmas = useMemo(
    () =>
      isEducation && viewingProfessional?.id
        ? turmas.filter((t) => t.professionalId === viewingProfessional.id)
        : [],
    [isEducation, turmas, viewingProfessional?.id],
  );

  const { data: bookings } = useBookings(isEducation ? '' : (business?.id ?? ''), {
    professionalId: viewingProfessional?.id ?? undefined,
  });
  const updateBooking = useUpdateBooking(business?.id ?? '');

  if (!professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Carregando...</p>
      </div>
    );
  }

  if (isEducation) {
    return (
      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {isOwnerProfessional && allProfessionals && allProfessionals.length > 1
                ? 'Calendário de aulas'
                : 'Minhas aulas'}
            </h1>
            <p className="text-neutral-600 mt-1">
              Horários das turmas em {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/tenant/professional/attendance"
              className="text-sm font-medium text-neutral-700 hover:text-neutral-900 underline"
            >
              Lista de chamada →
            </Link>
            <Link
              href="/tenant/professional/turmas"
              className="text-sm font-medium text-neutral-700 hover:text-neutral-900 underline"
            >
              Minhas turmas →
            </Link>
            {isOwnerProfessional && allProfessionals && allProfessionals.length > 1 && (
              <select
                value={selectedProId ?? professional.id}
                onChange={(e) => setSelectedProId(e.target.value || null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm bg-white"
              >
                <option value={professional.id}>{professional.name} (eu)</option>
                {allProfessionals
                  ?.filter((p) => p.id !== professional.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>

        {teacherTurmas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
            Nenhuma turma vinculada a este professor. Peça ao administrador para definir o professor em{' '}
            <span className="font-medium">Admin → Turmas</span>.
          </div>
        ) : (
          <TurmaScheduleMonthCalendar turmas={teacherTurmas} showTurmaFilter={teacherTurmas.length > 1} />
        )}

        {business?.id && user?.id && (
          <div className="mt-6">
            <NotificationsPreview
              businessId={business.id}
              recipientUserId={user.id}
              href="/tenant/professional/notifications"
              limit={5}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {isOwnerProfessional && allProfessionals && allProfessionals.length > 1
              ? 'Agenda'
              : 'Minha agenda'}
          </h1>
          <p className="text-neutral-600 mt-1">
            Agendamentos de {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Link
          href="/tenant/professional/bookings"
          className="text-sm font-medium text-neutral-700 hover:text-neutral-900 underline"
        >
          Ver lista e gerenciar status →
        </Link>
        {isOwnerProfessional && allProfessionals && allProfessionals.length > 1 && (
          <select
            value={selectedProId ?? professional.id}
            onChange={(e) => setSelectedProId(e.target.value || null)}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm bg-white"
          >
            <option value={professional.id}>{professional.name} (meu)</option>
            {allProfessionals
              ?.filter((p) => p.id !== professional.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        )}
      </div>
      <BookingCalendar
        bookings={bookings ?? []}
        workingHours={viewingProfessional?.workingHours ?? business?.settings?.workingHours}
        onStatusChange={async (bookingId, newStatus) => {
          await updateBooking.mutateAsync({ bookingId, updates: { status: newStatus as BookingStatus } });
        }}
      />

      {business?.id && user?.id && (
        <div className="mt-6">
          <NotificationsPreview
            businessId={business.id}
            recipientUserId={user.id}
            href="/tenant/professional/notifications"
            limit={5}
          />
        </div>
      )}
    </div>
  );
}

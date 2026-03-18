'use client';

import { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBookings } from '@/lib/queries/bookings';
import { useProfessionals } from '@/lib/queries/professionals';
import { BookingCalendar } from '@/components/admin/BookingCalendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotificationsPreview } from '@/components/notifications/NotificationsPreview';

export default function ProfessionalDashboardPage() {
  const { business } = useBusiness();
  const { professional, isOwnerProfessional } = useProfessional();
  const { user } = useAuth();
  const { data: allProfessionals } = useProfessionals(business?.id ?? '', { active: true });
  const [selectedProId, setSelectedProId] = useState<string | null>(null);

  const viewingProfessional =
    selectedProId && allProfessionals?.find((p) => p.id === selectedProId)
      ? allProfessionals.find((p) => p.id === selectedProId)!
      : professional;

  const { data: bookings } = useBookings(business?.id ?? '', {
    professionalId: viewingProfessional?.id ?? undefined,
  });

  if (!professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Carregando...</p>
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
        onStatusChange={async () => {}}
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

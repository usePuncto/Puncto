'use client';

import { useEffect, useMemo, useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import {
  useCreateEvent,
  useCreateEventRegistration,
  useDeleteEvent,
  useDeleteEventRegistration,
  useEventRegistrations,
  useEvents,
  useUpdateEvent,
  useUpdateEventRegistration,
} from '@/lib/queries/events';
import type { EventStatus } from '@/types/event';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDateBr(dateIso: string) {
  const dt = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return dateIso;
  return dt.toLocaleDateString('pt-BR');
}

function statusLabel(status: EventStatus) {
  if (status === 'active') return 'Ativo';
  if (status === 'soon') return 'Em breve';
  return 'Inativo';
}

function statusBadgeClass(status: EventStatus) {
  if (status === 'active') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (status === 'soon') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-neutral-300 bg-neutral-50 text-neutral-600';
}

export default function AdminEventosPage() {
  const { business } = useBusiness();
  const isEducation = business?.industry === 'education';
  const businessId = business?.id ?? '';

  const { data: events = [], isLoading: loadingEvents } = useEvents(businessId);
  const createEvent = useCreateEvent(businessId);
  const updateEvent = useUpdateEvent(businessId);
  const deleteEvent = useDeleteEvent(businessId);

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStatus, setEventStatus] = useState<EventStatus>('active');
  const [eventError, setEventError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    if (events.length === 0) {
      setSelectedEventId('');
      return;
    }
    if (!selectedEventId || !events.some((eventItem) => eventItem.id === selectedEventId)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find((eventItem) => eventItem.id === selectedEventId) || null,
    [events, selectedEventId],
  );

  const { data: registrations = [], isLoading: loadingRegistrations } = useEventRegistrations(
    businessId,
    selectedEventId,
  );
  const createRegistration = useCreateEventRegistration(businessId, selectedEventId);
  const updateRegistration = useUpdateEventRegistration(businessId, selectedEventId);
  const deleteRegistration = useDeleteEventRegistration(businessId, selectedEventId);

  const [registrationName, setRegistrationName] = useState('');
  const [registrationPhone, setRegistrationPhone] = useState('');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const [editingEvent, setEditingEvent] = useState(false);
  const [editEventName, setEditEventName] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventStatus, setEditEventStatus] = useState<EventStatus>('active');
  const [editEventError, setEditEventError] = useState<string | null>(null);

  const [editingRegistrationId, setEditingRegistrationId] = useState('');
  const [editRegistrationName, setEditRegistrationName] = useState('');
  const [editRegistrationPhone, setEditRegistrationPhone] = useState('');
  const [editRegistrationEmail, setEditRegistrationEmail] = useState('');
  const [editRegistrationError, setEditRegistrationError] = useState<string | null>(null);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(null);

    if (!eventName.trim()) {
      setEventError('Informe o nome do evento.');
      return;
    }
    if (!eventDate) {
      setEventError('Informe a data do evento.');
      return;
    }
    if (!eventLocation.trim()) {
      setEventError('Informe o local do evento.');
      return;
    }

    try {
      const created = await createEvent.mutateAsync({
        name: eventName,
        date: eventDate,
        location: eventLocation,
        status: eventStatus,
      });
      setEventName('');
      setEventDate('');
      setEventLocation('');
      setEventStatus('active');
      setSelectedEventId(created.id);
    } catch (error) {
      setEventError(error instanceof Error ? error.message : 'Erro ao criar evento.');
    }
  };

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError(null);

    if (!selectedEventId) {
      setRegistrationError('Selecione um evento antes de cadastrar.');
      return;
    }
    if (!registrationName.trim()) {
      setRegistrationError('Informe o nome.');
      return;
    }
    if (!registrationPhone.trim()) {
      setRegistrationError('Informe o telefone.');
      return;
    }
    if (!registrationEmail.trim() || !isValidEmail(registrationEmail)) {
      setRegistrationError('Informe um e-mail valido.');
      return;
    }

    try {
      await createRegistration.mutateAsync({
        name: registrationName,
        phone: registrationPhone,
        email: registrationEmail,
      });
      setRegistrationName('');
      setRegistrationPhone('');
      setRegistrationEmail('');
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'Erro ao cadastrar contato.');
    }
  };

  const startEditingEvent = () => {
    if (!selectedEvent) return;
    setEditingEvent(true);
    setEditEventName(selectedEvent.name);
    setEditEventDate(selectedEvent.date);
    setEditEventLocation(selectedEvent.location);
    setEditEventStatus(selectedEvent.status);
    setEditEventError(null);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditEventError(null);
    if (!selectedEvent) return;

    if (!editEventName.trim()) {
      setEditEventError('Informe o nome do evento.');
      return;
    }
    if (!editEventDate) {
      setEditEventError('Informe a data do evento.');
      return;
    }
    if (!editEventLocation.trim()) {
      setEditEventError('Informe o local do evento.');
      return;
    }

    try {
      await updateEvent.mutateAsync({
        eventId: selectedEvent.id,
        updates: {
          name: editEventName,
          date: editEventDate,
          location: editEventLocation,
          status: editEventStatus,
        },
      });
      setEditingEvent(false);
    } catch (error) {
      setEditEventError(error instanceof Error ? error.message : 'Erro ao atualizar evento.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!confirm(`Excluir o evento "${selectedEvent.name}"?`)) return;
    try {
      await deleteEvent.mutateAsync(selectedEvent.id);
      setEditingEvent(false);
    } catch (error) {
      setEventError(error instanceof Error ? error.message : 'Erro ao excluir evento.');
    }
  };

  const startEditingRegistration = (registrationId: string) => {
    const current = registrations.find((item) => item.id === registrationId);
    if (!current) return;
    setEditingRegistrationId(current.id);
    setEditRegistrationName(current.name);
    setEditRegistrationPhone(current.phone);
    setEditRegistrationEmail(current.email);
    setEditRegistrationError(null);
  };

  const handleUpdateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditRegistrationError(null);
    if (!editingRegistrationId) return;

    if (!editRegistrationName.trim()) {
      setEditRegistrationError('Informe o nome.');
      return;
    }
    if (!editRegistrationPhone.trim()) {
      setEditRegistrationError('Informe o telefone.');
      return;
    }
    if (!editRegistrationEmail.trim() || !isValidEmail(editRegistrationEmail)) {
      setEditRegistrationError('Informe um e-mail valido.');
      return;
    }

    try {
      await updateRegistration.mutateAsync({
        registrationId: editingRegistrationId,
        updates: {
          name: editRegistrationName,
          phone: editRegistrationPhone,
          email: editRegistrationEmail,
        },
      });
      setEditingRegistrationId('');
      setEditRegistrationName('');
      setEditRegistrationPhone('');
      setEditRegistrationEmail('');
    } catch (error) {
      setEditRegistrationError(error instanceof Error ? error.message : 'Erro ao atualizar cadastro.');
    }
  };

  const handleDeleteRegistration = async (registrationId: string) => {
    if (!confirm('Excluir este cadastro?')) return;
    try {
      await deleteRegistration.mutateAsync(registrationId);
      if (editingRegistrationId === registrationId) {
        setEditingRegistrationId('');
        setEditRegistrationName('');
        setEditRegistrationPhone('');
        setEditRegistrationEmail('');
        setEditRegistrationError(null);
      }
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'Erro ao excluir cadastro.');
    }
  };

  const exportRegistrationsCsv = () => {
    if (!selectedEvent) return;
    const rows: string[][] = [
      ['Evento', selectedEvent.name],
      ['Data', formatDateBr(selectedEvent.date)],
      ['Local', selectedEvent.location],
      ['Status', statusLabel(selectedEvent.status)],
      [],
      ['Nome', 'Telefone', 'Email'],
      ...registrations.map((item) => [item.name, item.phone, item.email]),
    ];

    const escapeCsv = (value: string) => {
      const normalized = value ?? '';
      if (normalized.includes('"') || normalized.includes(';') || normalized.includes('\n')) {
        return `"${normalized.replace(/"/g, '""')}"`;
      }
      return normalized;
    };

    const csv = rows
      .map((row) => row.map((cell) => escapeCsv(cell)).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = selectedEvent.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 40);
    link.href = url;
    link.setAttribute('download', `cadastros-${slug || 'evento'}-${selectedEvent.date}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!business?.id) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  if (!isEducation) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Eventos</h1>
        <p className="mt-2 text-neutral-600">
          A area de eventos esta disponivel apenas para negocios com industry Education.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Eventos</h1>
        <p className="mt-2 text-neutral-600">
          Crie eventos com nome, data e local. Em cada evento, use o coletor de cadastros para captar interessados.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">Novo evento</h2>
        <form onSubmit={handleCreateEvent} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Nome do evento"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
            placeholder="Local"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <select
            value={eventStatus}
            onChange={(e) => setEventStatus(e.target.value as EventStatus)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="active">Ativo</option>
            <option value="soon">Em breve</option>
            <option value="inactive">Inativo</option>
          </select>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={createEvent.isPending}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {createEvent.isPending ? 'Salvando...' : 'Criar evento'}
            </button>
          </div>
        </form>
        {eventError && <p className="mt-3 text-sm text-red-600">{eventError}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-1">
          <h2 className="text-lg font-semibold text-neutral-900">Eventos criados</h2>
          {loadingEvents ? (
            <div className="mt-4 flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
            </div>
          ) : events.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Nenhum evento criado ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {events.map((eventItem) => {
                const isSelected = selectedEventId === eventItem.id;
                return (
                  <li key={eventItem.id}>
                    <div
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'
                      }`}
                    >
                      <button type="button" onClick={() => setSelectedEventId(eventItem.id)} className="w-full text-left">
                        <p className="font-medium">{eventItem.name}</p>
                        <p className={`mt-1 text-xs ${isSelected ? 'text-neutral-200' : 'text-neutral-500'}`}>
                          {formatDateBr(eventItem.date)} - {eventItem.location}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(eventItem.status)}`}
                        >
                          {statusLabel(eventItem.status)}
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-neutral-900">Coletor de cadastros</h2>
          {!selectedEvent ? (
            <p className="mt-3 text-sm text-neutral-500">Selecione um evento para cadastrar participantes.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-neutral-600">
                Evento selecionado: <span className="font-medium text-neutral-900">{selectedEvent.name}</span> ({' '}
                {formatDateBr(selectedEvent.date)} - {selectedEvent.location})
              </p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(selectedEvent.status)}`}
              >
                {statusLabel(selectedEvent.status)}
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startEditingEvent}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Editar evento
                </button>
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={deleteEvent.isPending}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Excluir evento
                </button>
                <button
                  type="button"
                  onClick={exportRegistrationsCsv}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Exportar CSV
                </button>
              </div>

              {editingEvent && (
                <form onSubmit={handleUpdateEvent} className="mt-4 grid gap-3 rounded-lg border border-neutral-200 p-3 md:grid-cols-4">
                  <input
                    type="text"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    placeholder="Nome do evento"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={editEventLocation}
                    onChange={(e) => setEditEventLocation(e.target.value)}
                    placeholder="Local"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={editEventStatus}
                    onChange={(e) => setEditEventStatus(e.target.value as EventStatus)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  >
                    <option value="active">Ativo</option>
                    <option value="soon">Em breve</option>
                    <option value="inactive">Inativo</option>
                  </select>
                  <div className="flex gap-2 md:col-span-4">
                    <button
                      type="submit"
                      disabled={updateEvent.isPending}
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {updateEvent.isPending ? 'Salvando...' : 'Salvar alteracoes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEvent(false)}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancelar
                    </button>
                  </div>
                  {editEventError && <p className="text-sm text-red-600 md:col-span-4">{editEventError}</p>}
                </form>
              )}

              <form onSubmit={handleCreateRegistration} className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  type="text"
                  value={registrationName}
                  onChange={(e) => setRegistrationName(e.target.value)}
                  placeholder="Nome"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  value={registrationPhone}
                  onChange={(e) => setRegistrationPhone(e.target.value)}
                  placeholder="Telefone"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="email"
                  value={registrationEmail}
                  onChange={(e) => setRegistrationEmail(e.target.value)}
                  placeholder="Email"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={createRegistration.isPending}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {createRegistration.isPending ? 'Salvando...' : 'Adicionar cadastro'}
                  </button>
                </div>
              </form>
              {registrationError && <p className="mt-3 text-sm text-red-600">{registrationError}</p>}

              {editingRegistrationId && (
                <form onSubmit={handleUpdateRegistration} className="mt-4 grid gap-3 rounded-lg border border-neutral-200 p-3 md:grid-cols-3">
                  <input
                    type="text"
                    value={editRegistrationName}
                    onChange={(e) => setEditRegistrationName(e.target.value)}
                    placeholder="Nome"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="tel"
                    value={editRegistrationPhone}
                    onChange={(e) => setEditRegistrationPhone(e.target.value)}
                    placeholder="Telefone"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    value={editRegistrationEmail}
                    onChange={(e) => setEditRegistrationEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2 md:col-span-3">
                    <button
                      type="submit"
                      disabled={updateRegistration.isPending}
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {updateRegistration.isPending ? 'Salvando...' : 'Salvar cadastro'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRegistrationId('');
                        setEditRegistrationName('');
                        setEditRegistrationPhone('');
                        setEditRegistrationEmail('');
                        setEditRegistrationError(null);
                      }}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancelar
                    </button>
                  </div>
                  {editRegistrationError && <p className="text-sm text-red-600 md:col-span-3">{editRegistrationError}</p>}
                </form>
              )}

              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Cadastros recebidos</h3>
                {loadingRegistrations ? (
                  <div className="mt-3 flex h-20 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
                  </div>
                ) : registrations.length === 0 ? (
                  <p className="mt-3 text-sm text-neutral-500">Nenhum cadastro neste evento ainda.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
                    <table className="w-full">
                      <thead className="border-b border-neutral-200 bg-neutral-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Nome</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Telefone</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Acoes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {registrations.map((registration) => (
                          <tr key={registration.id}>
                            <td className="px-4 py-2 text-sm text-neutral-900">{registration.name}</td>
                            <td className="px-4 py-2 text-sm text-neutral-700">{registration.phone}</td>
                            <td className="px-4 py-2 text-sm text-neutral-700">{registration.email}</td>
                            <td className="px-4 py-2 text-sm">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditingRegistration(registration.id)}
                                  className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRegistration(registration.id)}
                                  disabled={deleteRegistration.isPending}
                                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

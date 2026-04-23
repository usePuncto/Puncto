'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getStudentCustomerId } from '@/lib/student/studentSession';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useStudentAttendance, useStudentTurmas } from '@/lib/queries/studentPortal';
import {
  useCancelRescheduleRequest,
  useCreateRescheduleRequest,
  useStudentRescheduleRequests,
} from '@/lib/queries/lessonReschedules';
import { auth } from '@/lib/firebase';
import type { AttendanceRollCall, RollCallStatus } from '@/types/attendance';

type ReplacementSlotCatalog = {
  turmas: Array<{
    turmaId: string;
    name: string;
    professionalId?: string;
    schedules: Array<{ weekday: number; startTime: string; endTime: string }>;
  }>;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDateBr(iso: string) {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function rollCallStatusLabel(status: RollCallStatus) {
  if (status === 'pending') return 'Pendente';
  if (status === 'present') return 'Presente';
  if (status === 'absent') return 'Falta';
  if (status === 'justified') return 'Justificada';
  return status;
}

async function fetchReplacementSlotCatalog(businessId: string): Promise<ReplacementSlotCatalog> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const res = await fetch(
    `/api/students/reschedules/available-slots?businessId=${encodeURIComponent(businessId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = (await res.json().catch(() => ({}))) as ReplacementSlotCatalog & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os horários disponíveis.');
  return { turmas: data.turmas || [] };
}

export default function StudentFaltasPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const studentCustomerId = getStudentCustomerId(user);
  const { data: attendance = [], isLoading } = useStudentAttendance(business.id, studentCustomerId);
  const { data: turmas = [] } = useStudentTurmas(business.id, studentCustomerId);
  const {
    data: requests = [],
    error: requestsQueryError,
    isError: requestsQueryFailed,
    refetch: refetchRequests,
  } = useStudentRescheduleRequests(business.id, studentCustomerId);
  const createRequest = useCreateRescheduleRequest(business.id);
  const cancelRequest = useCancelRescheduleRequest(business.id);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRollCall | null>(null);
  const [requestedDate, setRequestedDate] = useState('');
  const [selectedSlotKey, setSelectedSlotKey] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);

  const turmaById = useMemo(() => Object.fromEntries(turmas.map((t) => [t.id, t])), [turmas]);

  const {
    data: slotCatalog,
    isLoading: slotsLoading,
    isError: slotsFailed,
    error: slotsError,
  } = useQuery({
    queryKey: ['replacementSlotCatalog', business.id],
    queryFn: () => fetchReplacementSlotCatalog(business.id),
    enabled: !!selectedAttendance && !!business.id,
    staleTime: 60_000,
  });

  const requestByAttendanceId = useMemo(() => {
    const map = new Map<string, (typeof requests)[number]>();
    for (const row of requests) {
      if (!map.has(row.attendanceRollCallId)) {
        map.set(row.attendanceRollCallId, row);
      }
    }
    return map;
  }, [requests]);

  const weekdayOfSelectedDate = useMemo(() => {
    if (!requestedDate || !isIsoDate(requestedDate)) return null;
    return new Date(`${requestedDate}T12:00:00`).getDay();
  }, [requestedDate]);

  const slotOptions = useMemo(() => {
    if (weekdayOfSelectedDate == null || !slotCatalog?.turmas?.length) return [];
    const out: Array<{
      key: string;
      label: string;
      turmaId: string;
      startTime: string;
      endTime: string;
      professionalId?: string;
    }> = [];
    for (const t of slotCatalog.turmas) {
      for (const s of t.schedules) {
        if (s.weekday !== weekdayOfSelectedDate) continue;
        out.push({
          key: `${t.turmaId}|${s.startTime}|${s.endTime}`,
          label: `${t.name} • ${s.startTime} – ${s.endTime}`,
          turmaId: t.turmaId,
          startTime: s.startTime,
          endTime: s.endTime,
          professionalId: t.professionalId,
        });
      }
    }
    out.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    return out;
  }, [slotCatalog, weekdayOfSelectedDate]);

  useEffect(() => {
    if (!selectedAttendance) return;
    setSelectedSlotKey((prev) => {
      if (prev && slotOptions.some((o) => o.key === prev)) return prev;
      return slotOptions[0]?.key ?? '';
    });
  }, [selectedAttendance, slotOptions]);

  const openRequestModal = (record: AttendanceRollCall) => {
    setSelectedAttendance(record);
    setRequestReason('');
    setRequestError(null);
    setSelectedSlotKey('');
    setRequestedDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  };

  const closeRequestModal = () => {
    setSelectedAttendance(null);
    setRequestedDate('');
    setSelectedSlotKey('');
    setRequestReason('');
    setRequestError(null);
  };

  const rescheduleStatusLabel = (status: string) => {
    if (status === 'pending') return 'Pendente de aprovação';
    if (status === 'approved') return 'Aprovada';
    if (status === 'rejected') return 'Reprovada';
    if (status === 'cancelled_by_student') return 'Cancelada por você';
    return status;
  };

  const canCreateRequest = (record: AttendanceRollCall) => {
    if (record.status !== 'absent') return false;
    const request = requestByAttendanceId.get(record.id);
    if (!request) return true;
    return request.status === 'rejected' || request.status === 'cancelled_by_student';
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendance) return;
    if (!requestedDate || !selectedSlotKey) {
      setRequestError('Selecione data e horário para solicitar a reposição.');
      return;
    }
    const choice = slotOptions.find((o) => o.key === selectedSlotKey);
    if (!choice) {
      setRequestError('Selecione um horário válido na lista.');
      return;
    }
    try {
      await createRequest.mutateAsync({
        attendanceRollCallId: selectedAttendance.id,
        targetTurmaId: choice.turmaId,
        requestedDate,
        requestedStartTime: choice.startTime,
        requestedEndTime: choice.endTime,
        professionalId: choice.professionalId,
        reason: requestReason.trim() || undefined,
      });
      await refetchRequests();
      closeRequestModal();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Erro ao criar solicitação.');
    }
  };

  const dateHint =
    requestedDate && isIsoDate(requestedDate)
      ? format(new Date(`${requestedDate}T12:00:00`), "EEEE, dd/MM/yyyy", { locale: ptBR })
      : null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-neutral-900">Minhas faltas</h1>
      {requestsQueryFailed && requestsQueryError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Não foi possível carregar suas solicitações de reposição. Verifique se as regras do Firestore foram
          publicadas e se o projeto do app é o mesmo do Firebase Admin. Detalhes:{' '}
          {requestsQueryError instanceof Error ? requestsQueryError.message : String(requestsQueryError)}
        </div>
      )}
      {isLoading ? (
        <p className="text-sm text-neutral-500">Carregando...</p>
      ) : attendance.length === 0 ? (
        <p className="text-sm text-neutral-500">Sem registros de chamada.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Turma</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Reposição</th>
                <th className="px-4 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{formatDateBr(r.date)}</td>
                  <td className="px-4 py-2">{turmaById[r.turmaId]?.name || r.turmaId}</td>
                  <td className="px-4 py-2">{rollCallStatusLabel(r.status)}</td>
                  <td className="px-4 py-2 text-xs text-neutral-600">
                    {requestByAttendanceId.get(r.id) ? (
                      <div>
                        <p>{rescheduleStatusLabel(requestByAttendanceId.get(r.id)!.status)}</p>
                        <p>
                          {formatDateBr(requestByAttendanceId.get(r.id)!.requestedDate)} •{' '}
                          {requestByAttendanceId.get(r.id)!.requestedStartTime} -{' '}
                          {requestByAttendanceId.get(r.id)!.requestedEndTime}
                        </p>
                      </div>
                    ) : (
                      'Sem solicitação'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openRequestModal(r)}
                        disabled={!canCreateRequest(r) || createRequest.isPending}
                        className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Solicitar reposição
                      </button>
                      {requestByAttendanceId.get(r.id)?.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() =>
                            cancelRequest.mutate({
                              requestId: requestByAttendanceId.get(r.id)!.id,
                            })
                          }
                          disabled={cancelRequest.isPending}
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancelar pedido
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedAttendance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeRequestModal}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="request-reschedule-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="request-reschedule-title" className="text-lg font-semibold text-neutral-900">
              Solicitar reposição
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Falta em {formatDateBr(selectedAttendance.date)} •{' '}
              {turmaById[selectedAttendance.turmaId]?.name || 'Turma'}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Escolha uma data e um horário entre as turmas com vaga (abaixo do limite de alunos).
            </p>

            <form onSubmit={submitRequest} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Data desejada</label>
                <input
                  type="date"
                  value={requestedDate}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    setRequestedDate(e.target.value);
                    setSelectedSlotKey('');
                  }}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                {dateHint && (
                  <p className="mt-1 text-xs capitalize text-neutral-500">{dateHint}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Turma e horário (com vaga neste dia)
                </label>
                {slotsLoading ? (
                  <p className="mt-2 text-sm text-neutral-500">Carregando turmas e horários...</p>
                ) : slotsFailed ? (
                  <p className="mt-2 text-sm text-red-600">
                    {slotsError instanceof Error ? slotsError.message : 'Erro ao carregar horários.'}
                  </p>
                ) : (
                  <select
                    value={selectedSlotKey}
                    onChange={(e) => setSelectedSlotKey(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecione turma e horário...</option>
                    {slotOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {!slotsLoading && !slotsFailed && slotCatalog?.turmas?.length === 0 && (
                  <p className="mt-2 text-xs text-neutral-500">
                    Não há turmas com vaga no momento. Peça à escola para ajustar vagas ou turmas.
                  </p>
                )}
                {!slotsLoading &&
                  !slotsFailed &&
                  (slotCatalog?.turmas?.length ?? 0) > 0 &&
                  slotOptions.length === 0 &&
                  requestedDate && (
                    <p className="mt-2 text-xs text-neutral-500">
                      Nenhuma turma com vaga oferece aula neste dia da semana. Escolha outra data.
                    </p>
                  )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Observação (opcional)</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="Ex.: motivo da falta, preferência de reposição..."
                />
              </div>
              {requestError && <p className="text-sm text-red-600">{requestError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={createRequest.isPending || slotsLoading || !selectedSlotKey}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {createRequest.isPending ? 'Enviando...' : 'Enviar solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

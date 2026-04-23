'use client';

import { useMemo, useState } from 'react';
import { useCustomers } from '@/lib/queries/customers';
import {
  useReviewRescheduleRequest,
  useStaffRescheduleRequests,
} from '@/lib/queries/lessonReschedules';
import { useTurmas } from '@/lib/queries/turmas';
import { useProfessionals } from '@/lib/queries/professionals';
import type { LessonRescheduleRequestStatus } from '@/types/lessonReschedule';

interface RescheduleRequestsReviewPanelProps {
  businessId: string;
  professionalId?: string;
  title?: string;
  description?: string;
}

function statusLabel(status: LessonRescheduleRequestStatus) {
  if (status === 'pending') return 'Pendente';
  if (status === 'approved') return 'Aprovada';
  if (status === 'rejected') return 'Reprovada';
  return 'Cancelada pelo aluno';
}

export function RescheduleRequestsReviewPanel({
  businessId,
  professionalId,
  title = 'Solicitações de reposição',
  description = 'Revise os pedidos de remarcação feitos pelos alunos.',
}: RescheduleRequestsReviewPanelProps) {
  const [statusFilter, setStatusFilter] = useState<LessonRescheduleRequestStatus | 'all'>('pending');
  const [reviewNoteById, setReviewNoteById] = useState<Record<string, string>>({});
  const {
    data: requests = [],
    isLoading,
    isError,
    error: loadError,
  } = useStaffRescheduleRequests(businessId, {
    status: statusFilter,
    professionalId,
  });
  const { data: customers = [] } = useCustomers(businessId);
  const { data: turmas = [] } = useTurmas(businessId);
  const { data: professionals = [] } = useProfessionals(businessId, { active: true });
  const reviewRequest = useReviewRescheduleRequest(businessId);

  const customerById = useMemo(() => {
    return new Map(customers.map((c) => [c.id, `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.id]));
  }, [customers]);
  const turmaById = useMemo(() => new Map(turmas.map((t) => [t.id, t.name])), [turmas]);
  const professionalById = useMemo(
    () => new Map(professionals.map((p) => [p.id, p.name])),
    [professionals],
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as LessonRescheduleRequestStatus | 'all')
          }
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovadas</option>
          <option value="rejected">Reprovadas</option>
          <option value="cancelled_by_student">Canceladas pelo aluno</option>
          <option value="all">Todas</option>
        </select>
      </div>

      {isError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Erro ao carregar solicitações. Confirme as regras do Firestore e o projeto Firebase.{' '}
          {loadError instanceof Error ? loadError.message : String(loadError)}
        </p>
      )}

      {isLoading ? (
        <div className="mt-4 flex h-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
        </div>
      ) : requests.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">
          Nenhuma solicitação encontrada para o filtro selecionado.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {requests.map((request) => {
            const studentName = customerById.get(request.studentId) || request.studentId;
            const turmaName = turmaById.get(request.turmaId) || request.turmaId;
            const requestProfessional =
              request.professionalId && professionalById.get(request.professionalId)
                ? professionalById.get(request.professionalId)
                : null;
            const pending = request.status === 'pending';
            const note = reviewNoteById[request.id] || '';

            return (
              <div key={request.id} className="rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900">{studentName}</p>
                    <p className="text-sm text-neutral-600">Turma: {turmaName}</p>
                    <p className="text-sm text-neutral-600">
                      Reposição solicitada: {request.requestedDate} • {request.requestedStartTime} -{' '}
                      {request.requestedEndTime}
                    </p>
                    {requestProfessional && (
                      <p className="text-sm text-neutral-600">Professor: {requestProfessional}</p>
                    )}
                    {request.reason && (
                      <p className="mt-1 text-xs text-neutral-500">Motivo do aluno: {request.reason}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      request.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : request.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : request.status === 'cancelled_by_student'
                            ? 'bg-neutral-200 text-neutral-700'
                            : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {statusLabel(request.status)}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={note}
                    onChange={(e) =>
                      setReviewNoteById((prev) => ({ ...prev, [request.id]: e.target.value }))
                    }
                    placeholder="Observação da revisão (opcional)"
                    className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        reviewRequest.mutate({
                          requestId: request.id,
                          decision: 'reject',
                          reviewNote: note.trim() || undefined,
                        })
                      }
                      disabled={!pending || reviewRequest.isPending}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reprovar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        reviewRequest.mutate({
                          requestId: request.id,
                          decision: 'approve',
                          reviewNote: note.trim() || undefined,
                        })
                      }
                      disabled={!pending || reviewRequest.isPending}
                      className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  findNearestClassDate,
  formatTurmaClassWeekdaysShort,
  isClassDayForTurma,
  stepClassDate,
} from '@/lib/utils/turmaClassDays';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { useProfessionals } from '@/lib/queries/professionals';
import { useTurmas } from '@/lib/queries/turmas';
import { useCustomers } from '@/lib/queries/customers';
import { useAttendanceRollCallsByTurmaDate, useUpsertAttendanceRollCall } from '@/lib/queries/attendance';
import { useLessonRescheduleRequestsForTurmaDate } from '@/lib/queries/lessonReschedules';
import { buildRollCallRowsWithReplacementGuests } from '@/lib/education/rollCallStudents';
import { RescheduleRequestsReviewPanel } from '@/components/education/RescheduleRequestsReviewPanel';
import type { RollCallStatus } from '@/types/attendance';

function ProfessionalAttendanceContent() {
  const { business } = useBusiness();
  const { professional, isOwnerProfessional } = useProfessional();
  const searchParams = useSearchParams();
  const { data: allProfessionals } = useProfessionals(business?.id ?? '', { active: true });
  const { data: turmas = [] } = useTurmas(business?.id ?? '');
  const { data: customers = [] } = useCustomers(business?.id ?? '');

  const [viewProId, setViewProId] = useState<string | null>(null);
  const effectiveProId = viewProId ?? professional?.id ?? '';

  const myTurmas = useMemo(
    () => turmas.filter((t) => t.professionalId === effectiveProId),
    [turmas, effectiveProId],
  );

  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const selectedTurma = useMemo(
    () => myTurmas.find((t) => t.id === selectedTurmaId) || null,
    [myTurmas, selectedTurmaId],
  );

  const rollCallDate = dateFilter || format(new Date(), 'yyyy-MM-dd');
  const { data: rollCallRecords = [] } = useAttendanceRollCallsByTurmaDate(
    business?.id ?? '',
    selectedTurma?.id ?? '',
    rollCallDate,
  );
  const upsertRollCall = useUpsertAttendanceRollCall(business?.id ?? '');

  const rollCallStatusByStudentId = useMemo(() => {
    const m = new Map<string, RollCallStatus>();
    for (const rec of rollCallRecords) m.set(rec.studentId, rec.status);
    return m;
  }, [rollCallRecords]);

  const { data: rollCallDayRescheduleRequests = [] } = useLessonRescheduleRequestsForTurmaDate(
    business?.id ?? '',
    selectedTurma?.id ?? '',
    rollCallDate,
  );

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const selectedStudents = useMemo(() => {
    if (!selectedTurma) return [];
    return selectedTurma.studentIds
      .map((studentId) => customerById.get(studentId))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [customerById, selectedTurma]);

  const rollCallDisplayRows = useMemo(() => {
    if (!selectedTurma) return [];
    return buildRollCallRowsWithReplacementGuests(
      selectedTurma,
      rollCallDate,
      selectedStudents,
      rollCallDayRescheduleRequests,
      customerById,
    );
  }, [selectedTurma, rollCallDate, selectedStudents, rollCallDayRescheduleRequests, customerById]);

  useEffect(() => {
    const t = searchParams.get('t') || searchParams.get('turmaId');
    const d = searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDateFilter(d);
    if (t && myTurmas.some((x) => x.id === t)) setSelectedTurmaId(t);
  }, [searchParams, myTurmas]);

  useEffect(() => {
    if (selectedTurmaId) return;
    if (myTurmas.length === 0) return;
    setSelectedTurmaId(myTurmas[0].id);
  }, [myTurmas, selectedTurmaId]);

  useEffect(() => {
    if (!selectedTurmaId) return;
    const turma = myTurmas.find((x) => x.id === selectedTurmaId);
    if (!turma?.schedules?.length) return;
    setDateFilter((prev) =>
      isClassDayForTurma(turma, prev) ? prev : findNearestClassDate(turma, prev) || prev,
    );
  }, [selectedTurmaId, myTurmas]);

  const markRollCall = async (studentId: string, status: RollCallStatus) => {
    if (!selectedTurma) return;
    await upsertRollCall.mutateAsync({
      turmaId: selectedTurma.id,
      studentId,
      date: rollCallDate,
      status,
    });
  };

  if (!professional) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-neutral-500">Carregando...</p>
      </div>
    );
  }

  if (business?.industry !== 'education') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Lista de chamada</h1>
        <p className="mt-2 text-neutral-600">
          Disponível apenas para escolas e cursos no segmento Educação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Lista de chamada</h1>
          <p className="mt-1 text-neutral-600">
            Registre presença das suas turmas. A data da chamada segue apenas os dias em que a turma tem aula na
            grade (inclui datas passadas para consulta ou correção).
          </p>
        </div>
        {isOwnerProfessional && allProfessionals && allProfessionals.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Professor</label>
            <select
              value={effectiveProId}
              onChange={(e) => {
                setViewProId(e.target.value);
                setSelectedTurmaId(null);
              }}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white min-w-[200px]"
            >
              {allProfessionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <RescheduleRequestsReviewPanel
        businessId={business.id}
        professionalId={effectiveProId}
        title="Solicitações de reposição"
        description="Aprove ou reprovar pedidos das suas turmas."
      />

      {myTurmas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
          Nenhuma turma vinculada a este professor. Peça ao administrador para associar suas turmas em{' '}
          <span className="font-medium">Turmas</span> no painel admin.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h3 className="font-medium text-neutral-900">Minhas turmas</h3>
              <p className="text-xs text-neutral-500">Selecione a turma para registrar a chamada.</p>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-2">
              {myTurmas.map((turma) => {
                const selected = turma.id === selectedTurmaId;
                return (
                  <button
                    key={turma.id}
                    type="button"
                    onClick={() => setSelectedTurmaId(turma.id)}
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
              })}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white lg:col-span-2">
            <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-neutral-900">
                  {selectedTurma ? `Chamada — ${selectedTurma.name}` : 'Selecione uma turma'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Data: {format(new Date(`${rollCallDate}T12:00:00`), 'dd/MM/yyyy')}
                </p>
                {selectedTurma && selectedTurma.schedules?.length ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Dias com aula: {formatTurmaClassWeekdaysShort(selectedTurma)}
                  </p>
                ) : null}
              </div>
              {selectedTurma && selectedTurma.schedules?.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = stepClassDate(selectedTurma, dateFilter, -1);
                      if (prev) setDateFilter(prev);
                    }}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    Dia anterior
                  </button>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v || !selectedTurma) return;
                      if (isClassDayForTurma(selectedTurma, v)) setDateFilter(v);
                    }}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = stepClassDate(selectedTurma, dateFilter, 1);
                      if (next) setDateFilter(next);
                    }}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    Próximo dia
                  </button>
                </div>
              ) : null}
            </div>

            {!selectedTurma ? (
              <div className="p-8 text-center text-neutral-500">Escolha uma turma.</div>
            ) : !selectedTurma.schedules?.length ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Esta turma não tem horários na grade. Peça ao administrador para cadastrar os dias de aula em{' '}
                <span className="font-medium text-neutral-700">Turmas</span>.
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
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                        Aluno
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                        Status
                      </th>
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
                            status === value
                              ? activeClass
                              : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
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
    </div>
  );
}

export default function ProfessionalAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
        </div>
      }
    >
      <ProfessionalAttendanceContent />
    </Suspense>
  );
}

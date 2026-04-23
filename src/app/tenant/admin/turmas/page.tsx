'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useCustomers } from '@/lib/queries/customers';
import { useProfessionals } from '@/lib/queries/professionals';
import { useAttendanceRollCallsRange } from '@/lib/queries/attendance';
import {
  useTurmas,
  useCreateTurma,
  useUpdateTurma,
  useDeleteTurma,
} from '@/lib/queries/turmas';
import type { Turma, TurmaScheduleSlot, TurmaWeekday } from '@/types/turma';
import type { Customer } from '@/types/booking';
import type { RollCallStatus } from '@/types/attendance';

const WEEKDAY_OPTIONS: { value: TurmaWeekday; label: string }[] = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function customerDisplayName(c: Pick<Customer, 'firstName' | 'lastName'>) {
  return `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—';
}

function scheduleLabel(slot: TurmaScheduleSlot) {
  const day = WEEKDAY_OPTIONS.find((d) => d.value === slot.weekday)?.label || 'Dia';
  return `${day} • ${slot.startTime} - ${slot.endTime}`;
}

function pct(part: number, total: number) {
  if (total <= 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function parseMaxStudentsInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

export default function AdminTurmasPage() {
  const { business } = useBusiness();
  const isEducation = business?.industry === 'education';
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: turmas = [], isLoading: loadingTurmas } = useTurmas(business?.id ?? '');
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers(business?.id ?? '');
  const { data: professionals = [] } = useProfessionals(business?.id ?? '', { active: true });
  const createTurma = useCreateTurma(business?.id ?? '');
  const updateTurma = useUpdateTurma(business?.id ?? '');
  const deleteTurma = useDeleteTurma(business?.id ?? '');

  const customerById = useMemo(() => {
    const m = new Map<string, Customer>();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createSchedules, setCreateSchedules] = useState<TurmaScheduleSlot[]>([]);
  const [createWeekday, setCreateWeekday] = useState<TurmaWeekday>(1);
  const [createStartTime, setCreateStartTime] = useState('08:00');
  const [createEndTime, setCreateEndTime] = useState('09:00');
  const [createMaxStudents, setCreateMaxStudents] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [manageTurma, setManageTurma] = useState<Turma | null>(null);
  const [addStudentId, setAddStudentId] = useState('');
  const [manageWeekday, setManageWeekday] = useState<TurmaWeekday>(1);
  const [manageStartTime, setManageStartTime] = useState('08:00');
  const [manageEndTime, setManageEndTime] = useState('09:00');
  const [manageMaxStudentsInput, setManageMaxStudentsInput] = useState('');
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportTurmaFilter, setReportTurmaFilter] = useState<string>('all');

  const { data: attendanceInRange = [], isLoading: loadingAttendanceRange } = useAttendanceRollCallsRange(
    business?.id ?? '',
    reportStartDate,
    reportEndDate,
    reportGenerated,
  );

  const loading = loadingTurmas || loadingCustomers;
  const reachedManageCapacity = Boolean(
    manageTurma?.maxStudents && manageTurma.studentIds.length >= manageTurma.maxStudents,
  );

  const professionalById = useMemo(() => {
    const m = new Map(professionals.map((p) => [p.id, p]));
    return m;
  }, [professionals]);

  useEffect(() => {
    if (!isEducation) return;
    const tid = searchParams.get('t') || searchParams.get('turmaId');
    if (!tid || turmas.length === 0) return;
    const found = turmas.find((x) => x.id === tid);
    if (!found) return;
    setManageTurma(found);
    setAddStudentId('');
    router.replace('/tenant/admin/turmas', { scroll: false });
  }, [isEducation, searchParams, turmas, router]);

  useEffect(() => {
    setManageMaxStudentsInput(manageTurma?.maxStudents ? String(manageTurma.maxStudents) : '');
  }, [manageTurma?.id, manageTurma?.maxStudents]);

  const reportByTurma = useMemo(() => {
    const byTurma = new Map<
      string,
      {
        turmaName: string;
        present: number;
        absent: number;
        justified: number;
        pending: number;
        total: number;
        byStudent: Map<
          string,
          { name: string; present: number; absent: number; justified: number; pending: number; total: number }
        >;
      }
    >();
    const customerNameById = new Map(customers.map((c) => [c.id, customerDisplayName(c)]));
    const turmaNameById = new Map(turmas.map((t) => [t.id, t.name]));

    const addStatus = (
      target: { present: number; absent: number; justified: number; pending: number; total: number },
      status: RollCallStatus,
    ) => {
      target.total += 1;
      if (status === 'present') target.present += 1;
      else if (status === 'absent') target.absent += 1;
      else if (status === 'justified') target.justified += 1;
      else target.pending += 1;
    };

    for (const rec of attendanceInRange) {
      if (!byTurma.has(rec.turmaId)) {
        byTurma.set(rec.turmaId, {
          turmaName: turmaNameById.get(rec.turmaId) || 'Turma',
          present: 0,
          absent: 0,
          justified: 0,
          pending: 0,
          total: 0,
          byStudent: new Map(),
        });
      }
      const group = byTurma.get(rec.turmaId)!;
      addStatus(group, rec.status);

      if (!group.byStudent.has(rec.studentId)) {
        group.byStudent.set(rec.studentId, {
          name: customerNameById.get(rec.studentId) || rec.studentId,
          present: 0,
          absent: 0,
          justified: 0,
          pending: 0,
          total: 0,
        });
      }
      addStatus(group.byStudent.get(rec.studentId)!, rec.status);
    }

    return [...byTurma.entries()].map(([turmaId, value]) => ({
      turmaId,
      ...value,
      students: [...value.byStudent.entries()]
        .map(([studentId, stats]) => ({ studentId, ...stats }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [attendanceInRange, customers, turmas]);

  const filteredReportByTurma = useMemo(() => {
    if (reportTurmaFilter === 'all') return reportByTurma;
    return reportByTurma.filter((group) => group.turmaId === reportTurmaFilter);
  }, [reportByTurma, reportTurmaFilter]);

  const reportGeneral = useMemo(() => {
    let present = 0;
    let absent = 0;
    let justified = 0;
    let pending = 0;
    for (const rec of attendanceInRange) {
      if (rec.status === 'present') present += 1;
      else if (rec.status === 'absent') absent += 1;
      else if (rec.status === 'justified') justified += 1;
      else pending += 1;
    }
    const total = present + absent + justified + pending;
    return { present, absent, justified, pending, total };
  }, [attendanceInRange]);

  const filteredReportGeneral = useMemo(() => {
    if (reportTurmaFilter === 'all') return reportGeneral;
    const group = reportByTurma.find((g) => g.turmaId === reportTurmaFilter);
    if (!group) return { present: 0, absent: 0, justified: 0, pending: 0, total: 0 };
    return {
      present: group.present,
      absent: group.absent,
      justified: group.justified,
      pending: group.pending,
      total: group.total,
    };
  }, [reportByTurma, reportGeneral, reportTurmaFilter]);

  const exportAttendanceCsv = () => {
    if (!reportGenerated) return;

    const rows: string[][] = [
      ['Relatorio de Presenca'],
      ['Periodo', reportStartDate, reportEndDate],
      ['Turma', reportTurmaFilter === 'all' ? 'Todas' : (turmas.find((t) => t.id === reportTurmaFilter)?.name || 'Turma')],
      [],
      ['Resumo Geral'],
      ['Total', String(filteredReportGeneral.total)],
      ['Presencas', String(filteredReportGeneral.present), pct(filteredReportGeneral.present, filteredReportGeneral.total)],
      ['Faltas', String(filteredReportGeneral.absent), pct(filteredReportGeneral.absent, filteredReportGeneral.total)],
      ['Justificadas', String(filteredReportGeneral.justified), pct(filteredReportGeneral.justified, filteredReportGeneral.total)],
      ['Pendentes', String(filteredReportGeneral.pending), pct(filteredReportGeneral.pending, filteredReportGeneral.total)],
      [],
      ['Detalhe por Turma e Aluno'],
      ['Turma', 'Aluno', 'Presencas', 'Faltas', 'Justificadas', 'Pendentes', 'Total', 'Taxa'],
    ];

    for (const group of filteredReportByTurma) {
      if (group.students.length === 0) {
        rows.push([
          group.turmaName,
          '(sem alunos)',
          String(group.present),
          String(group.absent),
          String(group.justified),
          String(group.pending),
          String(group.total),
          pct(group.present, group.total),
        ]);
        continue;
      }

      for (const student of group.students) {
        rows.push([
          group.turmaName,
          student.name,
          String(student.present),
          String(student.absent),
          String(student.justified),
          String(student.pending),
          String(student.total),
          pct(student.present, student.total),
        ]);
      }
    }

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
    link.href = url;
    link.setAttribute('download', `relatorio-presenca-${reportStartDate}-a-${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!createName.trim()) {
      setCreateError('Informe o nome da turma.');
      return;
    }
    if (createSchedules.length === 0) {
      setCreateError('Adicione pelo menos um dia e horário para a turma.');
      return;
    }
    if (createMaxStudents.trim() !== '' && !parseMaxStudentsInput(createMaxStudents)) {
      setCreateError('Máximo de alunos deve ser um número inteiro maior que zero.');
      return;
    }
    try {
      await createTurma.mutateAsync({
        name: createName,
        description: createDescription,
        schedules: createSchedules,
        maxStudents: parseMaxStudentsInput(createMaxStudents),
      });
      setShowCreate(false);
      setCreateName('');
      setCreateDescription('');
      setCreateSchedules([]);
      setCreateMaxStudents('');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar turma.');
    }
  };

  const addCreateSchedule = () => {
    if (createStartTime >= createEndTime) {
      setCreateError('Horário inicial deve ser menor que o horário final.');
      return;
    }
    const next: TurmaScheduleSlot = {
      weekday: createWeekday,
      startTime: createStartTime,
      endTime: createEndTime,
    };
    setCreateSchedules((prev) => {
      const exists = prev.some(
        (s) =>
          s.weekday === next.weekday &&
          s.startTime === next.startTime &&
          s.endTime === next.endTime,
      );
      return exists ? prev : [...prev, next];
    });
    setCreateError(null);
  };

  const removeCreateSchedule = (index: number) => {
    setCreateSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  const availableToAdd = useMemo(() => {
    if (!manageTurma) return [];
    const set = new Set(manageTurma.studentIds);
    return customers.filter((c) => !set.has(c.id));
  }, [manageTurma, customers]);

  const addStudent = async () => {
    if (!business?.id || !manageTurma || !addStudentId) return;
    if (manageTurma.maxStudents && manageTurma.studentIds.length >= manageTurma.maxStudents) return;
    const next = [...new Set([...manageTurma.studentIds, addStudentId])];
    await updateTurma.mutateAsync({
      turmaId: manageTurma.id,
      updates: { studentIds: next },
    });
    setManageTurma((t) => (t ? { ...t, studentIds: next } : null));
    setAddStudentId('');
  };

  const removeStudent = async (studentId: string) => {
    if (!manageTurma) return;
    const next = manageTurma.studentIds.filter((id) => id !== studentId);
    await updateTurma.mutateAsync({
      turmaId: manageTurma.id,
      updates: { studentIds: next },
    });
    setManageTurma((t) => (t ? { ...t, studentIds: next } : null));
  };

  const addManageSchedule = async () => {
    if (!manageTurma) return;
    if (manageStartTime >= manageEndTime) return;
    const next: TurmaScheduleSlot = {
      weekday: manageWeekday,
      startTime: manageStartTime,
      endTime: manageEndTime,
    };
    const merged = [...manageTurma.schedules];
    const exists = merged.some(
      (s) =>
        s.weekday === next.weekday &&
        s.startTime === next.startTime &&
        s.endTime === next.endTime,
    );
    if (!exists) merged.push(next);
    await updateTurma.mutateAsync({
      turmaId: manageTurma.id,
      updates: { schedules: merged },
    });
    setManageTurma((t) => (t ? { ...t, schedules: merged } : null));
  };

  const removeManageSchedule = async (index: number) => {
    if (!manageTurma) return;
    const next = manageTurma.schedules.filter((_, i) => i !== index);
    await updateTurma.mutateAsync({
      turmaId: manageTurma.id,
      updates: { schedules: next },
    });
    setManageTurma((t) => (t ? { ...t, schedules: next } : null));
  };

  const assignTurmaProfessor = async (professionalId: string) => {
    if (!manageTurma) return;
    const trimmed = professionalId.trim();
    await updateTurma.mutateAsync({
      turmaId: manageTurma.id,
      updates: { professionalId: trimmed },
    });
    setManageTurma((t) =>
      t ? { ...t, professionalId: trimmed || undefined } : null,
    );
  };

  const saveManageMaxStudents = async () => {
    if (!manageTurma) return;
    if (manageMaxStudentsInput.trim() !== '' && !parseMaxStudentsInput(manageMaxStudentsInput)) return;
    const nextMaxStudents = parseMaxStudentsInput(manageMaxStudentsInput);
    await updateTurma.mutateAsync({
      turmaId: manageTurma.id,
      updates: { maxStudents: nextMaxStudents ?? null },
    });
    setManageTurma((t) => (t ? { ...t, maxStudents: nextMaxStudents } : null));
  };

  const handleDeleteTurma = async (t: Turma) => {
    if (!confirm(`Excluir a turma "${t.name}"? Os alunos não serão excluídos do sistema.`)) return;
    await deleteTurma.mutateAsync(t.id);
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
        <h1 className="text-3xl font-bold text-neutral-900">Turmas</h1>
        <p className="mt-2 text-neutral-600">
          O cadastro de turmas está disponível apenas para negócios do segmento Educação.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Turmas</h1>
          <p className="mt-2 text-neutral-600">
            Crie turmas e associe alunos cadastrados na aba Alunos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setShowCreate(true);
            setCreateSchedules([]);
            setCreateMaxStudents('');
          }}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Nova turma
        </button>
      </div>

      <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Relatório de presença</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Gere indicadores gerais e por turma/aluno dentro de um período.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-neutral-600">
              Turma
              <select
                value={reportTurmaFilter}
                onChange={(e) => setReportTurmaFilter(e.target.value)}
                className="mt-1 block rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="all">Todas as turmas</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-neutral-600">
              Início
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="mt-1 block rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-neutral-600">
              Fim
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="mt-1 block rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => setReportGenerated(true)}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Gerar relatório
            </button>
            <button
              type="button"
              onClick={exportAttendanceCsv}
              disabled={!reportGenerated}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {reportGenerated && (
          <div className="mt-4 space-y-4">
            {loadingAttendanceRange ? (
              <div className="flex h-20 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Total de registros</p>
                    <p className="text-xl font-semibold text-neutral-900">{filteredReportGeneral.total}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-xs text-green-700">Presenças</p>
                    <p className="text-xl font-semibold text-green-800">
                      {filteredReportGeneral.present} ({pct(filteredReportGeneral.present, filteredReportGeneral.total)})
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-xs text-red-700">Faltas</p>
                    <p className="text-xl font-semibold text-red-800">
                      {filteredReportGeneral.absent} ({pct(filteredReportGeneral.absent, filteredReportGeneral.total)})
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs text-blue-700">Justificadas</p>
                    <p className="text-xl font-semibold text-blue-800">
                      {filteredReportGeneral.justified} ({pct(filteredReportGeneral.justified, filteredReportGeneral.total)})
                    </p>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <p className="text-xs text-yellow-700">Pendentes</p>
                    <p className="text-xl font-semibold text-yellow-800">
                      {filteredReportGeneral.pending} ({pct(filteredReportGeneral.pending, filteredReportGeneral.total)})
                    </p>
                  </div>
                </div>

                {filteredReportByTurma.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">
                    Nenhum registro de chamada no período selecionado.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredReportByTurma.map((group) => (
                      <div key={group.turmaId} className="rounded-lg border border-neutral-200">
                        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                          <p className="font-medium text-neutral-900">{group.turmaName}</p>
                          <p className="text-xs text-neutral-600">
                            Presença: {group.present}/{group.total} ({pct(group.present, group.total)})
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="border-b border-neutral-200 bg-white">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Aluno</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Presenças</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Faltas</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Justificadas</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Pendentes</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-neutral-500">Taxa</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              {group.students.map((student) => (
                                <tr key={student.studentId}>
                                  <td className="px-4 py-2 text-sm">{student.name}</td>
                                  <td className="px-4 py-2 text-sm">{student.present}</td>
                                  <td className="px-4 py-2 text-sm">{student.absent}</td>
                                  <td className="px-4 py-2 text-sm">{student.justified}</td>
                                  <td className="px-4 py-2 text-sm">{student.pending}</td>
                                  <td className="px-4 py-2 text-sm">{pct(student.present, student.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
        </div>
      ) : turmas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
          Nenhuma turma cadastrada. Clique em &quot;Nova turma&quot; para começar.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((t) => (
            <div
              key={t.id}
              className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-neutral-900">{t.name}</h2>
              {t.description ? (
                <p className="mt-1 text-sm text-neutral-600 line-clamp-3">{t.description}</p>
              ) : null}
              <p className="mt-3 text-sm text-neutral-500">
                {t.studentIds.length} aluno{t.studentIds.length === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Limite:{' '}
                {t.maxStudents && t.maxStudents > 0 ? `${t.maxStudents} aluno${t.maxStudents === 1 ? '' : 's'}` : 'Sem limite'}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {t.schedules?.length || 0} horário{(t.schedules?.length || 0) === 1 ? '' : 's'}
              </p>
              {t.professionalId ? (
                <p className="mt-2 text-sm text-neutral-600">
                  Professor:{' '}
                  <span className="font-medium text-neutral-800">
                    {professionalById.get(t.professionalId)?.name || '—'}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">Sem professor vinculado</p>
              )}
              {t.schedules?.length ? (
                <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                  {t.schedules.slice(0, 2).map((slot, idx) => (
                    <li key={`${slot.weekday}-${slot.startTime}-${idx}`}>{scheduleLabel(slot)}</li>
                  ))}
                  {t.schedules.length > 2 && <li>+ {t.schedules.length - 2} horário(s)</li>}
                </ul>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManageTurma(t);
                    setAddStudentId('');
                    setManageMaxStudentsInput(t.maxStudents ? String(t.maxStudents) : '');
                  }}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Gerenciar alunos
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTurma(t)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreate(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="turma-create-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="turma-create-title" className="text-lg font-semibold text-neutral-900">
              Nova turma
            </h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label htmlFor="turma-name" className="block text-sm font-medium text-neutral-700">
                  Nome da turma *
                </label>
                <input
                  id="turma-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Ex.: Inglês manhã – turma A"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="turma-desc" className="block text-sm font-medium text-neutral-700">
                  Descrição (opcional)
                </label>
                <textarea
                  id="turma-desc"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Horário, nível, observações..."
                />
              </div>
              <div>
                <label htmlFor="turma-max-students" className="block text-sm font-medium text-neutral-700">
                  Máximo de alunos (opcional)
                </label>
                <input
                  id="turma-max-students"
                  type="number"
                  min={1}
                  step={1}
                  value={createMaxStudents}
                  onChange={(e) => setCreateMaxStudents(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Ex.: 20"
                />
              </div>
              <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
                <p className="text-sm font-medium text-neutral-700">Dias e horários da turma *</p>
                {createSchedules.length === 0 ? (
                  <p className="text-xs text-neutral-500">Nenhum horário adicionado.</p>
                ) : (
                  <ul className="space-y-1">
                    {createSchedules.map((slot, idx) => (
                      <li
                        key={`${slot.weekday}-${slot.startTime}-${slot.endTime}-${idx}`}
                        className="flex items-center justify-between rounded border border-neutral-200 px-2 py-1 text-xs"
                      >
                        <span>{scheduleLabel(slot)}</span>
                        <button
                          type="button"
                          onClick={() => removeCreateSchedule(idx)}
                          className="font-medium text-red-600 hover:text-red-700"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <select
                    value={createWeekday}
                    onChange={(e) => setCreateWeekday(Number(e.target.value) as TurmaWeekday)}
                    className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  >
                    {WEEKDAY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={createStartTime}
                    onChange={(e) => setCreateStartTime(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={createEndTime}
                    onChange={(e) => setCreateEndTime(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addCreateSchedule}
                    className="rounded-lg border border-neutral-300 px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createTurma.isPending}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {createTurma.isPending ? 'Salvando...' : 'Criar turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageTurma && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setManageTurma(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="turma-students-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="turma-students-title" className="text-lg font-semibold text-neutral-900">
              Turma — {manageTurma.name}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Gerencie dias/horários e os alunos vinculados à turma.
            </p>

            <div className="mt-4 rounded-lg border border-neutral-200 p-3">
              <label htmlFor="turma-professor" className="text-sm font-medium text-neutral-700">
                Professor(a)
              </label>
              <select
                id="turma-professor"
                value={manageTurma.professionalId || ''}
                onChange={(e) => assignTurmaProfessor(e.target.value)}
                disabled={updateTurma.isPending}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
              >
                <option value="">Nenhum</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 rounded-lg border border-neutral-200 p-3">
              <label htmlFor="turma-max-students-manage" className="text-sm font-medium text-neutral-700">
                Máximo de alunos
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id="turma-max-students-manage"
                  type="number"
                  min={1}
                  step={1}
                  value={manageMaxStudentsInput}
                  onChange={(e) => setManageMaxStudentsInput(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Deixe vazio para sem limite"
                />
                <button
                  type="button"
                  onClick={saveManageMaxStudents}
                  disabled={
                    updateTurma.isPending ||
                    (manageMaxStudentsInput.trim() !== '' && !parseMaxStudentsInput(manageMaxStudentsInput))
                  }
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Salvar limite
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Atual: {manageTurma.maxStudents ? `${manageTurma.maxStudents} alunos` : 'Sem limite'}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-neutral-200 p-3">
              <p className="text-sm font-medium text-neutral-700">Dias e horários</p>
              {manageTurma.schedules.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">Nenhum horário definido.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {manageTurma.schedules.map((slot, idx) => (
                    <li
                      key={`${slot.weekday}-${slot.startTime}-${slot.endTime}-${idx}`}
                      className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <span>{scheduleLabel(slot)}</span>
                      <button
                        type="button"
                        onClick={() => removeManageSchedule(idx)}
                        disabled={updateTurma.isPending}
                        className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                <select
                  value={manageWeekday}
                  onChange={(e) => setManageWeekday(Number(e.target.value) as TurmaWeekday)}
                  className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                >
                  {WEEKDAY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={manageStartTime}
                  onChange={(e) => setManageStartTime(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                />
                <input
                  type="time"
                  value={manageEndTime}
                  onChange={(e) => setManageEndTime(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => addManageSchedule()}
                  disabled={updateTurma.isPending || manageStartTime >= manageEndTime}
                  className="rounded-lg border border-neutral-300 px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {manageTurma.studentIds.length === 0 ? (
                <p className="text-sm text-neutral-500">Nenhum aluno nesta turma ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {manageTurma.studentIds.map((sid) => {
                    const c = customerById.get(sid);
                    return (
                      <li
                        key={sid}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <span>
                          {c ? customerDisplayName(c) : `Aluno não encontrado (${sid.slice(0, 8)}…)`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeStudent(sid)}
                          disabled={updateTurma.isPending}
                          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-4">
              <p className="text-sm font-medium text-neutral-700">Adicionar aluno</p>
              {reachedManageCapacity && (
                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Esta turma atingiu o limite máximo de alunos.
                </p>
              )}
              {customers.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">
                  Cadastre alunos na aba Alunos antes de vinculá-los aqui.
                </p>
              ) : availableToAdd.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">
                  Todos os alunos cadastrados já estão nesta turma.
                </p>
              ) : (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={addStudentId}
                    onChange={(e) => setAddStudentId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="">Selecione um aluno...</option>
                    {availableToAdd.map((c) => (
                      <option key={c.id} value={c.id}>
                        {customerDisplayName(c)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addStudent()}
                    disabled={!addStudentId || updateTurma.isPending || reachedManageCapacity}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setManageTurma(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

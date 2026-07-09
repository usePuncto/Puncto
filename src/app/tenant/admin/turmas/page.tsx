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
import { getProfessorScheduleConflictError } from '@/lib/education/turmaScheduleConflicts';

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
  const [creatingVip, setCreatingVip] = useState(false);
  const [activeTab, setActiveTab] = useState<'regular' | 'vip'>('regular');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createSchedules, setCreateSchedules] = useState<TurmaScheduleSlot[]>([]);
  const [createWeekday, setCreateWeekday] = useState<TurmaWeekday>(1);
  const [createStartTime, setCreateStartTime] = useState('08:00');
  const [createEndTime, setCreateEndTime] = useState('09:00');
  const [createMaxStudents, setCreateMaxStudents] = useState('');
  const [createVipProfessionalId, setCreateVipProfessionalId] = useState('');
  const [createVipStudentId, setCreateVipStudentId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [editTurma, setEditTurma] = useState<Turma | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxStudents, setEditMaxStudents] = useState('');
  const [editSchedules, setEditSchedules] = useState<TurmaScheduleSlot[]>([]);
  const [editWeekday, setEditWeekday] = useState<TurmaWeekday>(1);
  const [editStartTime, setEditStartTime] = useState('08:00');
  const [editEndTime, setEditEndTime] = useState('09:00');
  const [editError, setEditError] = useState<string | null>(null);

  const [manageTurma, setManageTurma] = useState<Turma | null>(null);
  const [addStudentId, setAddStudentId] = useState('');
  const [manageWeekday, setManageWeekday] = useState<TurmaWeekday>(1);
  const [manageStartTime, setManageStartTime] = useState('08:00');
  const [manageEndTime, setManageEndTime] = useState('09:00');
  const [manageMaxStudentsInput, setManageMaxStudentsInput] = useState('');
  const [manageProfessorError, setManageProfessorError] = useState<string | null>(null);
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
    manageTurma &&
      (manageTurma.isVip
        ? manageTurma.studentIds.length >= 1
        : manageTurma.maxStudents && manageTurma.studentIds.length >= manageTurma.maxStudents),
  );

  const professionalById = useMemo(() => {
    const m = new Map(professionals.map((p) => [p.id, p]));
    return m;
  }, [professionals]);

  const regularTurmas = useMemo(() => turmas.filter((t) => !t.isVip), [turmas]);
  const vipTurmas = useMemo(() => turmas.filter((t) => t.isVip), [turmas]);
  const displayedTurmas = activeTab === 'vip' ? vipTurmas : regularTurmas;

  const vipStudents = useMemo(
    () => customers.filter((c) => !c.isExperimentalStudent && c.modality === 'vip'),
    [customers],
  );

  const enrolledStudents = useMemo(
    () => customers.filter((c) => !c.isExperimentalStudent),
    [customers],
  );

  useEffect(() => {
    if (!isEducation) return;
    const tid = searchParams.get('t') || searchParams.get('turmaId');
    if (!tid || turmas.length === 0) return;
    const found = turmas.find((x) => x.id === tid);
    if (!found) return;
    setActiveTab(found.isVip ? 'vip' : 'regular');
    setManageTurma(found);
    setManageProfessorError(null);
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
      setCreateError(creatingVip ? 'Informe o nome da aula VIP.' : 'Informe o nome da turma.');
      return;
    }
    if (createSchedules.length === 0) {
      setCreateError('Adicione pelo menos um dia e horário.');
      return;
    }
    if (creatingVip) {
      if (!createVipProfessionalId) {
        setCreateError('Selecione o professor da aula VIP.');
        return;
      }
      if (!createVipStudentId) {
        setCreateError('Selecione o aluno VIP.');
        return;
      }
      const conflictError = getProfessorScheduleConflictError(
        turmas,
        createVipProfessionalId,
        createSchedules,
      );
      if (conflictError) {
        setCreateError(conflictError);
        return;
      }
    } else if (createMaxStudents.trim() !== '' && !parseMaxStudentsInput(createMaxStudents)) {
      setCreateError('Máximo de alunos deve ser um número inteiro maior que zero.');
      return;
    }
    try {
      await createTurma.mutateAsync(
        creatingVip
          ? {
              name: createName,
              description: createDescription,
              schedules: createSchedules,
              maxStudents: 1,
              isVip: true,
              professionalId: createVipProfessionalId,
              studentIds: [createVipStudentId],
            }
          : {
              name: createName,
              description: createDescription,
              schedules: createSchedules,
              maxStudents: parseMaxStudentsInput(createMaxStudents),
            },
      );
      setShowCreate(false);
      setCreatingVip(false);
      setCreateName('');
      setCreateDescription('');
      setCreateSchedules([]);
      setCreateMaxStudents('');
      setCreateVipProfessionalId('');
      setCreateVipStudentId('');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar.');
    }
  };

  const openEditTurma = (t: Turma) => {
    setEditError(null);
    setEditTurma(t);
    setEditName(t.name);
    setEditDescription(t.description || '');
    setEditMaxStudents(t.maxStudents ? String(t.maxStudents) : '');
    setEditSchedules(t.schedules?.length ? [...t.schedules] : []);
    setEditWeekday(1);
    setEditStartTime('08:00');
    setEditEndTime('09:00');
  };

  const addEditSchedule = () => {
    if (editStartTime >= editEndTime) {
      setEditError('Horário inicial deve ser menor que o horário final.');
      return;
    }
    const next: TurmaScheduleSlot = {
      weekday: editWeekday,
      startTime: editStartTime,
      endTime: editEndTime,
    };
    if (editTurma?.professionalId) {
      const conflictError = getProfessorScheduleConflictError(
        turmas,
        editTurma.professionalId,
        [...editSchedules, next],
        { excludeTurmaId: editTurma.id },
      );
      if (conflictError) {
        setEditError(conflictError);
        return;
      }
    }
    setEditSchedules((prev) => {
      const exists = prev.some(
        (s) =>
          s.weekday === next.weekday &&
          s.startTime === next.startTime &&
          s.endTime === next.endTime,
      );
      return exists ? prev : [...prev, next];
    });
    setEditError(null);
  };

  const removeEditSchedule = (index: number) => {
    setEditSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editTurma) return;
    if (!editName.trim()) {
      setEditError('Informe o nome da turma.');
      return;
    }
    if (editMaxStudents.trim() !== '' && !parseMaxStudentsInput(editMaxStudents)) {
      setEditError('Máximo de alunos deve ser um número inteiro maior que zero.');
      return;
    }
    const nextMax = parseMaxStudentsInput(editMaxStudents);
    if (editTurma.professionalId && editSchedules.length > 0) {
      const conflictError = getProfessorScheduleConflictError(
        turmas,
        editTurma.professionalId,
        editSchedules,
        { excludeTurmaId: editTurma.id },
      );
      if (conflictError) {
        setEditError(conflictError);
        return;
      }
    }
    try {
      await updateTurma.mutateAsync({
        turmaId: editTurma.id,
        updates: {
          name: editName,
          description: editDescription,
          schedules: editSchedules,
          maxStudents: nextMax ?? null,
        },
      });
      setManageTurma((m) =>
        m?.id === editTurma.id
          ? {
              ...m,
              name: editName.trim(),
              description: editDescription.trim(),
              schedules: editSchedules,
              maxStudents: nextMax,
            }
          : m,
      );
      setEditTurma(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Erro ao salvar alterações.');
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
    if (creatingVip && createVipProfessionalId) {
      const conflictError = getProfessorScheduleConflictError(
        turmas,
        createVipProfessionalId,
        [...createSchedules, next],
      );
      if (conflictError) {
        setCreateError(conflictError);
        return;
      }
    }
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
    const pool = manageTurma.isVip ? vipStudents : enrolledStudents;
    return pool.filter((c) => !set.has(c.id));
  }, [manageTurma, vipStudents, enrolledStudents]);

  const addStudent = async () => {
    if (!business?.id || !manageTurma || !addStudentId) return;
    if (manageTurma.maxStudents && manageTurma.studentIds.length >= manageTurma.maxStudents) return;
    const next = manageTurma.isVip
      ? [addStudentId]
      : [...new Set([...manageTurma.studentIds, addStudentId])];
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
    if (manageTurma.professionalId) {
      const conflictError = getProfessorScheduleConflictError(
        turmas,
        manageTurma.professionalId,
        [...manageTurma.schedules, next],
        { excludeTurmaId: manageTurma.id },
      );
      if (conflictError) {
        setManageProfessorError(conflictError);
        return;
      }
    }
    setManageProfessorError(null);
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
    if (trimmed && manageTurma.schedules.length > 0) {
      const conflictError = getProfessorScheduleConflictError(
        turmas,
        trimmed,
        manageTurma.schedules,
        { excludeTurmaId: manageTurma.id },
      );
      if (conflictError) {
        setManageProfessorError(conflictError);
        return;
      }
    }
    setManageProfessorError(null);
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

  const openCreateModal = () => {
    const isVip = activeTab === 'vip';
    setCreateError(null);
    setCreatingVip(isVip);
    setShowCreate(true);
    setCreateSchedules([]);
    setCreateMaxStudents(isVip ? '1' : '');
    setCreateVipProfessionalId('');
    setCreateVipStudentId('');
    setCreateName('');
    setCreateDescription('');
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
            {activeTab === 'vip'
              ? 'Aulas individuais VIP com um aluno e professor por horário.'
              : 'Crie turmas em grupo e associe alunos cadastrados na aba Alunos.'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {activeTab === 'vip' ? 'Nova aula VIP' : 'Nova turma'}
        </button>
      </div>

      <div className="mb-6 flex gap-1 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab('regular')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'regular'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Turmas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vip')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'vip'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Aulas VIP
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
      ) : displayedTurmas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
          {activeTab === 'vip'
            ? 'Nenhuma aula VIP cadastrada. Clique em "Nova aula VIP" para começar.'
            : 'Nenhuma turma cadastrada. Clique em "Nova turma" para começar.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedTurmas.map((t) => (
            <div
              key={t.id}
              className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${
                t.isVip ? 'border-amber-200' : 'border-neutral-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-neutral-900">{t.name}</h2>
                {t.isVip && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    VIP
                  </span>
                )}
              </div>
              {t.description ? (
                <p className="mt-1 text-sm text-neutral-600 line-clamp-3">{t.description}</p>
              ) : null}
              <p className="mt-3 text-sm text-neutral-500">
                {t.isVip ? 'Aluno VIP' : `${t.studentIds.length} aluno${t.studentIds.length === 1 ? '' : 's'}`}
                {t.isVip && t.studentIds[0] && (
                  <span className="font-medium text-neutral-800">
                    {' '}
                    — {customerDisplayName(customerById.get(t.studentIds[0]) || { firstName: '—', lastName: '' })}
                  </span>
                )}
              </p>
              {!t.isVip && (
              <p className="mt-1 text-sm text-neutral-500">
                Limite:{' '}
                {t.maxStudents && t.maxStudents > 0 ? `${t.maxStudents} aluno${t.maxStudents === 1 ? '' : 's'}` : 'Sem limite'}
              </p>
              )}
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
                    setManageProfessorError(null);
                    setAddStudentId('');
                    setManageMaxStudentsInput(t.maxStudents ? String(t.maxStudents) : '');
                  }}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  {t.isVip ? 'Gerenciar aula' : 'Gerenciar alunos'}
                </button>
                <button
                  type="button"
                  onClick={() => openEditTurma(t)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Editar
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

      {editTurma && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditTurma(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="turma-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="turma-edit-title" className="text-lg font-semibold text-neutral-900">
              {editTurma.isVip ? 'Editar aula VIP' : 'Editar turma'}
            </h2>
            <form onSubmit={handleEditTurma} className="mt-4 space-y-4">
              <div>
                <label htmlFor="turma-edit-name" className="block text-sm font-medium text-neutral-700">
                  Nome da turma *
                </label>
                <input
                  id="turma-edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="turma-edit-desc" className="block text-sm font-medium text-neutral-700">
                  Descrição (opcional)
                </label>
                <textarea
                  id="turma-edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Horário, nível, observações..."
                />
              </div>
              {!editTurma.isVip && (
              <div>
                <label htmlFor="turma-edit-max-students" className="block text-sm font-medium text-neutral-700">
                  Máximo de alunos (opcional)
                </label>
                <input
                  id="turma-edit-max-students"
                  type="number"
                  min={1}
                  step={1}
                  value={editMaxStudents}
                  onChange={(e) => setEditMaxStudents(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Deixe vazio para sem limite"
                />
              </div>
              )}
              <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
                <p className="text-sm font-medium text-neutral-700">
                  {editTurma.isVip ? 'Dias e horários da aula' : 'Dias e horários da turma'}
                </p>
                {editSchedules.length === 0 ? (
                  <p className="text-xs text-neutral-500">Nenhum horário adicionado.</p>
                ) : (
                  <ul className="space-y-1">
                    {editSchedules.map((slot, idx) => (
                      <li
                        key={`${slot.weekday}-${slot.startTime}-${slot.endTime}-${idx}`}
                        className="flex items-center justify-between rounded border border-neutral-200 px-2 py-1 text-xs"
                      >
                        <span>{scheduleLabel(slot)}</span>
                        <button
                          type="button"
                          onClick={() => removeEditSchedule(idx)}
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
                    value={editWeekday}
                    onChange={(e) => setEditWeekday(Number(e.target.value) as TurmaWeekday)}
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
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addEditSchedule}
                    className="rounded-lg border border-neutral-300 px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTurma(null)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateTurma.isPending}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {updateTurma.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowCreate(false);
            setCreatingVip(false);
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="turma-create-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="turma-create-title" className="text-lg font-semibold text-neutral-900">
              {creatingVip ? 'Nova aula VIP' : 'Nova turma'}
            </h2>
            {creatingVip && (
              <p className="mt-1 text-sm text-neutral-600">
                Aula individual com um aluno VIP e um professor. O horário aparece no calendário do professor.
              </p>
            )}
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label htmlFor="turma-name" className="block text-sm font-medium text-neutral-700">
                  {creatingVip ? 'Nome da aula *' : 'Nome da turma *'}
                </label>
                <input
                  id="turma-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder={creatingVip ? 'Ex.: Inglês VIP — Maria' : 'Ex.: Inglês manhã – turma A'}
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
              {creatingVip ? (
                <>
                  <div>
                    <label htmlFor="vip-professor" className="block text-sm font-medium text-neutral-700">
                      Professor *
                    </label>
                    <select
                      id="vip-professor"
                      value={createVipProfessionalId}
                      onChange={(e) => setCreateVipProfessionalId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    >
                      <option value="">Selecione o professor...</option>
                      {professionals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="vip-student" className="block text-sm font-medium text-neutral-700">
                      Aluno VIP *
                    </label>
                    <select
                      id="vip-student"
                      value={createVipStudentId}
                      onChange={(e) => setCreateVipStudentId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    >
                      <option value="">Selecione o aluno...</option>
                      {vipStudents.map((c) => (
                        <option key={c.id} value={c.id}>
                          {customerDisplayName(c)}
                        </option>
                      ))}
                    </select>
                    {vipStudents.length === 0 && (
                      <p className="mt-1 text-xs text-amber-700">
                        Cadastre alunos com modalidade VIP na aba Alunos.
                      </p>
                    )}
                  </div>
                </>
              ) : (
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
              )}
              <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
                <p className="text-sm font-medium text-neutral-700">
                  {creatingVip ? 'Dias e horários da aula *' : 'Dias e horários da turma *'}
                </p>
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
                  onClick={() => {
                    setShowCreate(false);
                    setCreatingVip(false);
                  }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createTurma.isPending}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {createTurma.isPending ? 'Salvando...' : creatingVip ? 'Criar aula VIP' : 'Criar turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageTurma && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setManageTurma(null);
            setManageProfessorError(null);
          }}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="turma-students-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="turma-students-title" className="text-lg font-semibold text-neutral-900">
              {manageTurma.isVip ? 'Aula VIP' : 'Turma'} — {manageTurma.name}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {manageTurma.isVip
                ? 'Gerencie professor, horários e o aluno desta aula individual.'
                : 'Gerencie dias/horários e os alunos vinculados à turma.'}
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
              {manageProfessorError && (
                <p className="mt-2 whitespace-pre-line text-sm text-red-600">{manageProfessorError}</p>
              )}
            </div>

            {!manageTurma.isVip && (
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
            )}

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
              <p className="text-sm font-medium text-neutral-700">
                {manageTurma.isVip ? 'Aluno VIP' : 'Adicionar aluno'}
              </p>
              {reachedManageCapacity && (
                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {manageTurma.isVip
                    ? 'Esta aula VIP já possui um aluno. Remova o atual para trocar.'
                    : 'Esta turma atingiu o limite máximo de alunos.'}
                </p>
              )}
              {(manageTurma.isVip ? vipStudents : enrolledStudents).length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">
                  {manageTurma.isVip
                    ? 'Cadastre alunos com modalidade VIP na aba Alunos.'
                    : 'Cadastre alunos na aba Alunos antes de vinculá-los aqui.'}
                </p>
              ) : availableToAdd.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">
                  {manageTurma.isVip
                    ? 'Todos os alunos VIP já estão vinculados ou a aula está lotada.'
                    : 'Todos os alunos cadastrados já estão nesta turma.'}
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
                    {manageTurma.isVip ? 'Definir aluno' : 'Adicionar'}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
            setManageTurma(null);
            setManageProfessorError(null);
          }}
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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ensureStudentTuitionSubscription } from '@/lib/student/ensureTuitionSubscription';
import { useCreateCustomer } from '@/lib/queries/customers';
import { useTurmas } from '@/lib/queries/turmas';
import {
  useConvertExperimentalStudent,
  useCreateExperimentalLesson,
  useDeleteExperimentalLesson,
  useExperimentalLessons,
  useUpdateExperimentalLesson,
} from '@/lib/queries/experimentalLessons';
import { useCustomers } from '@/lib/queries/customers';
import { useTuitionTypes } from '@/lib/queries/tuitionTypes';
import { formatPhoneInput } from '@/lib/utils/phone';
import { formatCpfInput } from '@/lib/utils/cpf';
import { BRAZIL_UFS } from '@/lib/constants/brazilUfs';
import { isClassDayForTurma } from '@/lib/utils/turmaClassDays';
import type { ExperimentalLesson } from '@/types/experimentalLesson';
import type { Customer } from '@/types/booking';

const emptyForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  cpf: '',
  birthDate: '',
  notes: '',
  turmaId: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  address: {
    street: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  },
};

export default function AdminExperimentalLessonsPage() {
  const router = useRouter();
  const { business } = useBusiness();
  const { firebaseUser } = useAuth();
  const isEducation = business?.industry === 'education';

  const { data: lessons = [], isLoading: lessonsLoading } = useExperimentalLessons(business?.id ?? '');
  const { data: turmas = [] } = useTurmas(business?.id ?? '');
  const { data: customers = [] } = useCustomers(business?.id ?? '');
  const { data: tuitionTypes = [] } = useTuitionTypes(business?.id ?? '', isEducation);
  const createCustomer = useCreateCustomer(business?.id ?? '');
  const createLesson = useCreateExperimentalLesson(business?.id ?? '');
  const updateLesson = useUpdateExperimentalLesson(business?.id ?? '');
  const deleteLesson = useDeleteExperimentalLesson(business?.id ?? '');
  const convertStudent = useConvertExperimentalStudent(business?.id ?? '');

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<ExperimentalLesson | null>(null);
  const [editTurmaId, setEditTurmaId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [convertingStudent, setConvertingStudent] = useState<Customer | null>(null);
  const [convertTurmaIds, setConvertTurmaIds] = useState<string[]>([]);
  const [convertTuitionTypeId, setConvertTuitionTypeId] = useState('');
  const [convertError, setConvertError] = useState<string | null>(null);

  useEffect(() => {
    if (business && !isEducation) {
      router.replace('/tenant/admin/dashboard');
    }
  }, [business, isEducation, router]);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const turmaById = useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);

  const filteredLessons = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return lessons;
    return lessons.filter((lesson) => {
      const student = customerById.get(lesson.studentId);
      const turma = turmaById.get(lesson.turmaId);
      const studentName = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';
      const turmaName = (turma?.name || '').toLowerCase();
      const phone = (student?.phone || '').replace(/\D/g, '');
      const searchDigits = q.replace(/\D/g, '');
      return (
        studentName.includes(q) ||
        turmaName.includes(q) ||
        lesson.date.includes(q) ||
        (searchDigits.length >= 4 && phone.includes(searchDigits))
      );
    });
  }, [lessons, search, customerById, turmaById]);

  const selectedTurmaForForm = turmas.find((t) => t.id === formData.turmaId) || null;
  const isFormDateClassDay =
    !selectedTurmaForForm || isClassDayForTurma(selectedTurmaForForm, formData.date);

  const resetForm = () => {
    setFormData(emptyForm);
    setError(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      setError('Nome e telefone são obrigatórios');
      return;
    }
    if (!formData.turmaId) {
      setError('Selecione uma turma');
      return;
    }
    if (!formData.date) {
      setError('Informe a data da aula experimental');
      return;
    }

    const turma = turmaById.get(formData.turmaId);
    if (turma && !isClassDayForTurma(turma, formData.date)) {
      setError('A data escolhida não é um dia de aula desta turma na grade semanal');
      return;
    }

    try {
      const created = await createCustomer.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        cpf: formData.cpf.trim() || undefined,
        birthDate: formData.birthDate || undefined,
        notes: formData.notes.trim() || undefined,
        isExperimentalStudent: true,
        address: formData.address,
      });

      await createLesson.mutateAsync({
        studentId: created.id,
        turmaId: formData.turmaId,
        date: formData.date,
        notes: formData.notes.trim() || undefined,
      });

      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar aula experimental');
    }
  };

  const openEdit = (lesson: ExperimentalLesson) => {
    setEditingLesson(lesson);
    setEditTurmaId(lesson.turmaId);
    setEditDate(lesson.date);
    setEditNotes(lesson.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingLesson) return;
    const turma = turmaById.get(editTurmaId);
    if (turma && !isClassDayForTurma(turma, editDate)) {
      window.alert('A data escolhida não é um dia de aula desta turma na grade semanal');
      return;
    }
    try {
      await updateLesson.mutateAsync({
        lessonId: editingLesson.id,
        turmaId: editTurmaId,
        date: editDate,
        notes: editNotes,
      });
      setEditingLesson(null);
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  };

  const handleDelete = async (lesson: ExperimentalLesson) => {
    const student = customerById.get(lesson.studentId);
    const name = student ? `${student.firstName} ${student.lastName}` : 'este aluno';
    if (!window.confirm(`Remover a aula experimental de ${name}?`)) return;
    try {
      await deleteLesson.mutateAsync(lesson.id);
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  const openConvertModal = (student: Customer) => {
    const turmaIdsFromLessons = [
      ...new Set(lessons.filter((l) => l.studentId === student.id).map((l) => l.turmaId)),
    ];
    setConvertingStudent(student);
    setConvertTurmaIds(turmaIdsFromLessons);
    setConvertTuitionTypeId(student.tuitionTypeId || '');
    setConvertError(null);
  };

  const toggleConvertTurma = (turmaId: string) => {
    setConvertTurmaIds((prev) =>
      prev.includes(turmaId) ? prev.filter((id) => id !== turmaId) : [...prev, turmaId],
    );
  };

  const handleConvert = async () => {
    if (!convertingStudent) return;
    setConvertError(null);
    if (convertTurmaIds.length === 0) {
      setConvertError('Selecione ao menos uma turma');
      return;
    }
    const name = `${convertingStudent.firstName} ${convertingStudent.lastName}`.trim();
    if (
      !window.confirm(
        `Converter ${name} em aluno fixo?\n\nO aluno será matriculado nas turmas selecionadas e os agendamentos experimentais serão removidos.`,
      )
    ) {
      return;
    }
    try {
      await convertStudent.mutateAsync({
        studentId: convertingStudent.id,
        turmaIds: convertTurmaIds,
        tuitionTypeId: convertTuitionTypeId || undefined,
      });

      if (
        convertTuitionTypeId &&
        convertingStudent.email?.trim() &&
        firebaseUser
      ) {
        const tuitionResult = await ensureStudentTuitionSubscription(() => firebaseUser.getIdToken(), {
          businessId: business!.id,
          customerId: convertingStudent.id,
        });
        if (!tuitionResult.ok && tuitionResult.error) {
          window.alert(
            `Aluno convertido com sucesso, mas não foi possível preparar a mensalidade:\n\n${tuitionResult.error}`,
          );
        }
      }

      setConvertingStudent(null);
      window.alert(`${name} agora é um aluno fixo. Você pode gerenciá-lo na aba Alunos.`);
    } catch (err: unknown) {
      setConvertError(err instanceof Error ? err.message : 'Erro ao converter aluno');
    }
  };

  if (!isEducation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  if (lessonsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Aulas experimentais</h1>
          <p className="text-neutral-600 mt-2">
            Cadastre visitantes e agende a turma e a data da aula experimental. Eles aparecem na lista de
            chamada somente na data agendada.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Nova aula experimental
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por aluno, turma, telefone ou data..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
        />
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Novo aluno experimental</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Sobrenome *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone *</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={16}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">CPF</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCpfInput(e.target.value) })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Data de nascimento</label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                rows={2}
              />
            </div>

            <div className="border-t border-neutral-200 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900">Agendamento da aula</h3>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Turma *</label>
                <select
                  value={formData.turmaId}
                  onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                >
                  <option value="">Selecione uma turma...</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Data da aula experimental *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
                {selectedTurmaForForm && !isFormDateClassDay && (
                  <p className="mt-1 text-xs text-amber-700">
                    Esta data não corresponde a um dia de aula da turma na grade semanal.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900">Endereço</h3>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Rua</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formData.address.neighborhood}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, neighborhood: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Estado (UF)</label>
                <select
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {BRAZIL_UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createCustomer.isPending || createLesson.isPending}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {createCustomer.isPending || createLesson.isPending ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {filteredLessons.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            {lessons.length === 0
              ? 'Nenhuma aula experimental cadastrada. Clique em "Nova aula experimental" para adicionar.'
              : 'Nenhum resultado com os filtros aplicados.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">Turma</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">Telefone</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(() => {
                  const convertButtonShown = new Set<string>();
                  return filteredLessons.map((lesson) => {
                  const student = customerById.get(lesson.studentId);
                  const turma = turmaById.get(lesson.turmaId);
                  const dateLabel = format(new Date(`${lesson.date}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR });
                  const canConvert = !!student?.isExperimentalStudent;
                  const showConvertButton = canConvert && !convertButtonShown.has(lesson.studentId);
                  if (showConvertButton) convertButtonShown.add(lesson.studentId);
                  return (
                    <tr key={lesson.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <span>{student ? `${student.firstName} ${student.lastName}` : '—'}</span>
                          {showConvertButton && student && (
                            <button
                              type="button"
                              onClick={() => openConvertModal(student)}
                              className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 hover:bg-green-200"
                            >
                              Converter para aluno fixo
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-700">{turma?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-700">{dateLabel}</td>
                      <td className="px-4 py-3 text-sm text-neutral-700">{student?.phone || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(lesson)}
                            className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(lesson)}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {convertingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Converter para aluno fixo</h3>
            <p className="text-sm text-neutral-600 mb-4">
              {convertingStudent.firstName} {convertingStudent.lastName} passará a aparecer na aba{' '}
              <span className="font-medium">Alunos</span> e na lista de chamada das turmas matriculadas em todos
              os dias de aula.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Turmas para matricular *
                </label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 p-3">
                  {turmas.length === 0 ? (
                    <p className="text-sm text-neutral-500">Nenhuma turma cadastrada.</p>
                  ) : (
                    turmas.map((t) => {
                      const enrolled = t.studentIds.includes(convertingStudent.id);
                      const atCapacity =
                        t.maxStudents && t.maxStudents > 0 && t.studentIds.length >= t.maxStudents;
                      const disabled = enrolled || (!!atCapacity && !convertTurmaIds.includes(t.id));
                      return (
                        <label
                          key={t.id}
                          className={`flex items-start gap-2 text-sm ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={convertTurmaIds.includes(t.id)}
                            disabled={disabled}
                            onChange={() => toggleConvertTurma(t.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium text-neutral-900">{t.name}</span>
                            {enrolled && (
                              <span className="ml-1 text-xs text-neutral-500">(já matriculado)</span>
                            )}
                            {atCapacity && !enrolled && (
                              <span className="ml-1 text-xs text-amber-700">(lotada)</span>
                            )}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de mensalidade</label>
                <select
                  value={convertTuitionTypeId}
                  onChange={(e) => setConvertTuitionTypeId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">Nenhum</option>
                  {tuitionTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  Opcional. Com e-mail do aluno, a mensalidade pode ser preparada no portal do aluno.
                </p>
              </div>
              {convertError && <p className="text-sm text-red-600">{convertError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConvertingStudent(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={convertStudent.isPending || convertTurmaIds.length === 0}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {convertStudent.isPending ? 'Convertendo...' : 'Confirmar conversão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Editar aula experimental</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Turma</label>
                <select
                  value={editTurmaId}
                  onChange={(e) => setEditTurmaId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Data da aula</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Observações</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateLesson.isPending}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {updateLesson.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

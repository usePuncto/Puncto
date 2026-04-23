'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { getStudentCustomerId } from '@/lib/student/studentSession';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useStudentTurmas } from '@/lib/queries/studentPortal';

export default function StudentTurmasPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const studentCustomerId = getStudentCustomerId(user);
  const { data: turmas = [], isLoading, isError, error } = useStudentTurmas(business.id, studentCustomerId);

  const errorMessage =
    isError && error != null ? (error instanceof Error ? error.message : String(error)) : null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-neutral-900">Minhas turmas</h1>
      {!studentCustomerId ? (
        <p className="text-sm text-amber-800">
          Conta sem vínculo ao cadastro de aluno. Peça à escola para reenviar o convite de acesso.
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Não foi possível carregar as turmas. ({errorMessage})
        </p>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-neutral-500">Carregando...</p>
      ) : !errorMessage && turmas.length === 0 ? (
        <div className="space-y-2 text-sm text-neutral-600">
          <p>Nenhuma turma encontrada para você.</p>
          <p className="text-neutral-500">
            A escola precisa vincular você à turma em <span className="font-medium text-neutral-700">Administração →
            Turmas</span> (incluir o aluno na turma). Depois disso, a turma aparece aqui automaticamente.
          </p>
        </div>
      ) : null}
      {!isLoading && !errorMessage && turmas.length > 0 ? (
        <div className="grid gap-3">
          {turmas.map((t) => (
            <div key={t.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="font-medium text-neutral-900">{t.name}</p>
              <p className="mt-1 text-sm text-neutral-600">{t.description || 'Sem descricao'}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

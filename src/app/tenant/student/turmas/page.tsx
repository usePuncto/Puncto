'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useStudentTurmas } from '@/lib/queries/studentPortal';

export default function StudentTurmasPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const studentCustomerId = user?.customClaims?.studentCustomerId;
  const { data: turmas = [], isLoading } = useStudentTurmas(business.id, studentCustomerId);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-neutral-900">Minhas turmas</h1>
      {isLoading ? (
        <p className="text-sm text-neutral-500">Carregando...</p>
      ) : turmas.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma turma encontrada.</p>
      ) : (
        <div className="grid gap-3">
          {turmas.map((t) => (
            <div key={t.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="font-medium text-neutral-900">{t.name}</p>
              <p className="mt-1 text-sm text-neutral-600">{t.description || 'Sem descricao'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

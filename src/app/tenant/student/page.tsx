'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useStudentAttendance, useStudentSubscriptions, useStudentTurmas } from '@/lib/queries/studentPortal';

export default function StudentHomePage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const studentCustomerId = user?.customClaims?.studentCustomerId;
  const { data: turmas = [] } = useStudentTurmas(business.id, studentCustomerId);
  const { data: attendance = [] } = useStudentAttendance(business.id, studentCustomerId);
  const { data: subs = [] } = useStudentSubscriptions(business.id, studentCustomerId);

  const faltas = attendance.filter((a) => a.status === 'absent').length;
  const ultimaSub = subs[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Resumo do aluno</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Turmas</p>
          <p className="mt-2 text-2xl font-semibold">{turmas.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Faltas registradas</p>
          <p className="mt-2 text-2xl font-semibold">{faltas}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Mensalidade</p>
          <p className="mt-2 text-sm font-medium text-neutral-900">{ultimaSub?.status || 'Sem assinatura'}</p>
        </div>
      </div>
    </div>
  );
}

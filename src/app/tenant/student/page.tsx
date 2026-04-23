'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import {
  useStudentAttendance,
  useStudentCustomerProfile,
  useStudentSubscriptions,
  useStudentTurmas,
} from '@/lib/queries/studentPortal';
import { getStudentCustomerId } from '@/lib/student/studentSession';

export default function StudentHomePage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const studentCustomerId = getStudentCustomerId(user);
  const { data: turmas = [] } = useStudentTurmas(business.id, studentCustomerId);
  const { data: attendance = [] } = useStudentAttendance(business.id, studentCustomerId);
  const { data: subs = [] } = useStudentSubscriptions(business.id, studentCustomerId);
  const { data: profile } = useStudentCustomerProfile(business.id, studentCustomerId);

  const faltas = attendance.filter((a) => a.status === 'absent').length;
  const ultimaSub = subs[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Resumo do aluno</h1>
      {profile?.firstName ? (
        <p className="text-sm text-neutral-600">
          Olá,{' '}
          <span className="font-medium text-neutral-900">
            {profile.firstName} {profile.lastName || ''}
          </span>
        </p>
      ) : null}
      {!studentCustomerId ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sua conta não está vinculada ao cadastro de aluno (ID ausente). Peça à escola para reenviar o convite de
          acesso ou verificar o cadastro.
        </p>
      ) : null}
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

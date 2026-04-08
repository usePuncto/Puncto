'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useStudentAttendance, useStudentTurmas } from '@/lib/queries/studentPortal';

export default function StudentFaltasPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const studentCustomerId = user?.customClaims?.studentCustomerId;
  const { data: attendance = [], isLoading } = useStudentAttendance(business.id, studentCustomerId);
  const { data: turmas = [] } = useStudentTurmas(business.id, studentCustomerId);

  const turmaById = useMemo(
    () => Object.fromEntries(turmas.map((t) => [t.id, t.name])),
    [turmas]
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-neutral-900">Minhas faltas</h1>
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
              </tr>
            </thead>
            <tbody>
              {attendance.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{r.date}</td>
                  <td className="px-4 py-2">{turmaById[r.turmaId] || r.turmaId}</td>
                  <td className="px-4 py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

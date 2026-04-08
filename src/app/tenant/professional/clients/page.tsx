'use client';

import { useMemo, useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { useBookings } from '@/lib/queries/bookings';
import { useCustomers } from '@/lib/queries/customers';
import { useProfessionals } from '@/lib/queries/professionals';
import { useTurmas } from '@/lib/queries/turmas';

export default function ProfessionalClientsPage() {
  const { business } = useBusiness();
  const { professional, isOwnerProfessional } = useProfessional();
  const isEducation = business?.industry === 'education';

  const { data: bookings } = useBookings(business?.id ?? '', {
    professionalId: !isEducation ? professional?.id : undefined,
  });
  const { data: turmas = [] } = useTurmas(isEducation ? (business?.id ?? '') : '');
  const { data: customers = [] } = useCustomers(isEducation ? (business?.id ?? '') : '');
  const { data: allProfessionals } = useProfessionals(business?.id ?? '', { active: true });

  const [viewProId, setViewProId] = useState<string | null>(null);
  const effectiveProId = viewProId ?? professional?.id ?? '';

  const teacherTurmas = useMemo(
    () => (isEducation ? turmas.filter((t) => t.professionalId === effectiveProId) : []),
    [isEducation, turmas, effectiveProId],
  );

  const studentsFromTurmas = useMemo(() => {
    if (!isEducation) return [];
    const byId = new Map(customers.map((c) => [c.id, c]));
    const rows: {
      id: string;
      name: string;
      phone: string;
      email?: string;
      turmaNames: string[];
    }[] = [];
    const seen = new Map<string, { turmaNames: Set<string> }>();

    for (const t of teacherTurmas) {
      for (const sid of t.studentIds) {
        const c = byId.get(sid);
        if (!c) continue;
        let entry = seen.get(sid);
        if (!entry) {
          entry = { turmaNames: new Set() };
          seen.set(sid, entry);
        }
        entry.turmaNames.add(t.name);
      }
    }

    for (const [id, { turmaNames }] of seen) {
      const c = byId.get(id)!;
      rows.push({
        id,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Aluno',
        phone: c.phone || '—',
        email: c.email,
        turmaNames: [...turmaNames].sort(),
      });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [isEducation, teacherTurmas, customers]);

  const clients = useMemo(() => {
    if (!bookings) return [];
    const byKey = new Map<string, { name: string; phone?: string; email?: string; count: number }>();

    for (const b of bookings) {
      const first = b.customerData?.firstName || '';
      const last = b.customerData?.lastName || '';
      const name = `${first} ${last}`.trim() || 'Cliente';
      const key = (b.customerData?.phone || b.customerData?.email || name).toLowerCase();
      if (!key) continue;

      const existing = byKey.get(key);
      if (existing) {
        existing.count++;
      } else {
        byKey.set(key, {
          name,
          phone: b.customerData?.phone,
          email: b.customerData?.email,
          count: 1,
        });
      }
    }
    return Array.from(byKey.values());
  }, [bookings]);

  if (!professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Carregando...</p>
      </div>
    );
  }

  if (isEducation) {
    return (
      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Meus alunos</h1>
            <p className="text-neutral-600 mt-1">Alunos das turmas em que você é professor</p>
          </div>
          {isOwnerProfessional && allProfessionals && allProfessionals.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Professor</label>
              <select
                value={effectiveProId}
                onChange={(e) => setViewProId(e.target.value)}
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
        <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Turmas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {studentsFromTurmas.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 text-sm font-medium text-neutral-900">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{s.phone}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{s.turmaNames.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {studentsFromTurmas.length === 0 && (
            <div className="p-8 text-center text-neutral-500">
              Nenhum aluno nas suas turmas. Verifique o vínculo com as turmas no painel admin.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Meus clientes</h1>
        <p className="text-neutral-600 mt-1">Clientes que agendaram com você</p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Telefone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Agendamentos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {clients.map((c) => (
              <tr key={c.phone || c.email || c.name} className="hover:bg-neutral-50">
                <td className="px-6 py-4 text-sm font-medium text-neutral-900">{c.name}</td>
                <td className="px-6 py-4 text-sm text-neutral-600">{c.phone || '—'}</td>
                <td className="px-6 py-4 text-sm text-neutral-600">{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="p-8 text-center text-neutral-500">Nenhum cliente encontrado</div>
        )}
      </div>
    </div>
  );
}

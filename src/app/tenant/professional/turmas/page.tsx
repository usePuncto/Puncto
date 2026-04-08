'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { useProfessionals } from '@/lib/queries/professionals';
import { useTurmas } from '@/lib/queries/turmas';

const WEEKDAY_LABEL: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

function slotLabel(slot: { weekday: number; startTime: string; endTime: string }) {
  const day = WEEKDAY_LABEL[slot.weekday] || 'Dia';
  return `${day} • ${slot.startTime} - ${slot.endTime}`;
}

export default function ProfessionalTurmasPage() {
  const { business } = useBusiness();
  const { professional, isOwnerProfessional } = useProfessional();
  const { data: allProfessionals } = useProfessionals(business?.id ?? '', { active: true });
  const { data: turmas = [], isLoading } = useTurmas(business?.id ?? '');

  const [viewProId, setViewProId] = useState<string | null>(null);
  const effectiveProId = viewProId ?? professional?.id ?? '';

  const myTurmas = useMemo(
    () => turmas.filter((t) => t.professionalId === effectiveProId),
    [turmas, effectiveProId],
  );

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
        <h1 className="text-2xl font-bold text-neutral-900">Turmas</h1>
        <p className="mt-2 text-neutral-600">Disponível apenas para o segmento Educação.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Minhas turmas</h1>
          <p className="mt-1 text-neutral-600">Turmas em que você está como professor</p>
        </div>
        {isOwnerProfessional && allProfessionals && allProfessionals.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Visualizar como</label>
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

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
        </div>
      ) : myTurmas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
          Nenhuma turma vinculada. O administrador pode associar um professor a cada turma em{' '}
          <span className="font-medium">Admin → Turmas</span>.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myTurmas.map((t) => (
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
              {t.schedules?.length ? (
                <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                  {t.schedules.map((slot, idx) => (
                    <li key={`${slot.weekday}-${slot.startTime}-${idx}`}>{slotLabel(slot)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-neutral-400">Sem horários cadastrados</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/tenant/professional/attendance?t=${t.id}`}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Lista de chamada
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

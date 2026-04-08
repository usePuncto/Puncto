'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { WorkingHours } from '@/types/business';

const WEEKDAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_WH: WorkingHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '14:00', closed: false },
  sunday: { open: '09:00', close: '14:00', closed: true },
};

export default function ProfessionalWorkingHoursPage() {
  const router = useRouter();
  const { business } = useBusiness();
  const { professional } = useProfessional();

  useEffect(() => {
    if (business?.industry === 'education') {
      router.replace('/tenant/professional');
    }
  }, [business?.industry, router]);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WH);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const businessHours = business?.settings?.workingHours ?? {};
  const isBusinessClosed = (day: keyof WorkingHours) =>
    businessHours[day] && typeof businessHours[day] === 'object' && (businessHours[day] as { closed?: boolean }).closed === true;

  useEffect(() => {
    const wh = professional?.workingHours ?? business?.settings?.workingHours ?? {};
    const merged = { ...DEFAULT_WH, ...wh } as WorkingHours;
    // For days the business is closed, force closed for professional
    WEEKDAYS.forEach(({ key }) => {
      if (isBusinessClosed(key)) {
        merged[key] = { ...merged[key], open: merged[key]?.open ?? '09:00', close: merged[key]?.close ?? '18:00', closed: true };
      }
    });
    setWorkingHours(merged);
  }, [professional?.workingHours, business?.settings?.workingHours]);

  const update = (day: keyof WorkingHours, field: string, value: string | boolean) => {
    if (isBusinessClosed(day)) return; // cannot change days when business is closed
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    if (!business?.id || !professional?.id) {
      setError('Dados não carregados. Recarregue a página e tente novamente.');
      return;
    }
    const toSave: WorkingHours = { ...workingHours };
    WEEKDAYS.forEach(({ key }) => {
      if (isBusinessClosed(key)) {
        toSave[key] = { open: toSave[key]?.open ?? '09:00', close: toSave[key]?.close ?? '18:00', closed: true };
      }
    });
    setSaving(true);
    try {
      const res = await fetch(`/api/professionals/${professional.id}?businessId=${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingHours: toSave }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Erro ao salvar');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Carregando...</p>
      </div>
    );
  }

  if (business?.industry === 'education') {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Meus horários</h1>
        <p className="text-neutral-600 mt-1">
          Defina seus horários de atendimento
        </p>
      </div>
      <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-6 max-w-lg">
        <p className="text-sm text-neutral-600 mb-4">
          Horários diferentes do estabelecimento são permitidos, mas dias em que o estabelecimento não abre ficam bloqueados.
        </p>
        <div className="space-y-4">
          {WEEKDAYS.map(({ key, label }) => {
            const businessClosed = isBusinessClosed(key);
            return (
              <div key={key} className={`flex flex-wrap items-center gap-4 ${businessClosed ? 'opacity-70' : ''}`}>
                <span className="w-20 text-sm font-medium text-neutral-700">{label}</span>
                {businessClosed ? (
                  <span className="text-sm text-neutral-500">Fechado (estabelecimento não abre)</span>
                ) : (
                  <>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={workingHours[key]?.closed ?? false}
                        onChange={(e) => update(key, 'closed', e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                      <span className="text-sm text-neutral-600">Fechado</span>
                    </label>
                    {!workingHours[key]?.closed && (
                      <>
                        <input
                          type="time"
                          value={workingHours[key]?.open || '09:00'}
                          onChange={(e) => update(key, 'open', e.target.value)}
                          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                        />
                        <span className="text-neutral-400">até</span>
                        <input
                          type="time"
                          value={workingHours[key]?.close || '18:00'}
                          onChange={(e) => update(key, 'close', e.target.value)}
                          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-4 text-sm text-green-600">Horários salvos com sucesso!</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar horários'}
        </button>
      </form>
    </div>
  );
}

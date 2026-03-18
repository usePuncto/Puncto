'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { useServices } from '@/lib/queries/services';

export default function ProfessionalServicesPage() {
  const { business } = useBusiness();
  const { professional } = useProfessional();
  const { data: allServices } = useServices(business?.id ?? '');
  const services =
    (allServices ?? []).filter((s) =>
      s.professionalIds?.includes(professional?.id ?? '')
    );

  if (!professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Meus serviços</h1>
        <p className="text-neutral-600 mt-1">Serviços que você presta</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-neutral-200 bg-white p-6"
          >
            <h3 className="font-semibold text-neutral-900">{s.name}</h3>
            {s.description && (
              <p className="text-sm text-neutral-600 mt-1">{s.description}</p>
            )}
            <p className="mt-4 text-lg font-semibold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(s.price / 100)}
            </p>
            <p className="text-sm text-neutral-500">{s.durationMinutes} min</p>
          </div>
        ))}
      </div>
      {services.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          Nenhum serviço atribuído
        </div>
      )}
    </div>
  );
}

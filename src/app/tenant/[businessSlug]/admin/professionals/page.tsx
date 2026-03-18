'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessionals } from '@/lib/queries/professionals';

export default function AdminProfessionalsPage() {
  const { business } = useBusiness();
  const { data: professionals, isLoading } = useProfessionals(business.id, { active: true });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">Profissionais</h1>
        <p className="text-neutral-600 mt-2">Gerencie sua equipe</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {professionals?.map((professional) => (
          <div
            key={professional.id}
            className="rounded-lg border border-neutral-200 bg-white p-6"
          >
            {professional.avatarUrl && (
              <img
                src={professional.avatarUrl}
                alt={professional.name}
                className="h-16 w-16 rounded-full object-cover mx-auto mb-4"
              />
            )}
            <h3 className="text-lg font-semibold text-center">{professional.name}</h3>
            {professional.bio && (
              <p className="text-sm text-neutral-600 mt-2 text-center">{professional.bio}</p>
            )}
            {professional.specialties && professional.specialties.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {professional.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
            {professional.rating && (
              <div className="mt-4 text-center">
                <span className="text-sm text-neutral-600">
                  ⭐ {professional.rating.toFixed(1)} ({professional.totalReviews || 0} avaliações)
                </span>
              </div>
            )}
          </div>
        ))}

        {professionals?.length === 0 && (
          <div className="col-span-full p-8 text-center text-neutral-500">
            Nenhum profissional cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}

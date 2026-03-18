'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { LoyaltyProgram } from '@/types/crm';

export default function AdminLoyaltyPage() {
  const { business } = useBusiness();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrograms();
  }, [business?.id]);

  const loadPrograms = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/loyalty/programs?businessId=${business.id}`);
      const data = await res.json();
      setPrograms(data.programs || []);
    } catch (error) {
      console.error('Failed to load loyalty programs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Programa de Fidelidade</h1>
          <p className="text-neutral-600 mt-2">Gerencie programas de pontos e cashback</p>
        </div>

        <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800">
          + Novo Programa
        </button>
      </div>

      {programs.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-500">Nenhum programa de fidelidade configurado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => (
            <div key={program.id} className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{program.name}</h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    Tipo: {program.type === 'points' && 'Pontos'}
                    {program.type === 'cashback' && 'Cashback'}
                    {program.type === 'tier' && 'Tiers'}
                  </p>
                  {program.rules.pointsPerReal && (
                    <p className="text-sm text-neutral-600">
                      {program.rules.pointsPerReal} ponto(s) por R$ 1,00
                    </p>
                  )}
                </div>
                <span className={`rounded px-2 py-1 text-xs font-medium ${
                  program.active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-800'
                }`}>
                  {program.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

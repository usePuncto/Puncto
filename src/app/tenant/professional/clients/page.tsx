'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessional } from '@/lib/contexts/ProfessionalContext';
import { useBookings } from '@/lib/queries/bookings';
import { useMemo } from 'react';

export default function ProfessionalClientsPage() {
  const { business } = useBusiness();
  const { professional } = useProfessional();

  const { data: bookings } = useBookings(business?.id ?? '', {
    professionalId: professional?.id,
  });

  const clients = useMemo(() => {
    if (!bookings) return [];
    const seen = new Set<string>();
    const list: { name: string; phone?: string; email?: string; bookingsCount: number }[] = [];
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

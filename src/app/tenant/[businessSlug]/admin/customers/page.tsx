'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useBookings } from '@/lib/queries/bookings';
import { useMemo } from 'react';

export default function AdminCustomersPage() {
  const { business } = useBusiness();
  const { data: bookings, isLoading } = useBookings(business.id);

  const customers = useMemo(() => {
    if (!bookings) return [];

    const customerMap = new Map();

    bookings.forEach((booking) => {
      const customerId = booking.customerId || booking.customerData?.phone || 'guest';
      const existing = customerMap.get(customerId);

      if (existing) {
        existing.totalBookings += 1;
        existing.totalSpent += booking.price || 0;
        if (booking.status === 'completed') {
          existing.completedBookings += 1;
        }
      } else {
        customerMap.set(customerId, {
          id: customerId,
          name: `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim() || 'Cliente',
          email: booking.customerData?.email || '',
          phone: booking.customerData?.phone || '',
          totalBookings: 1,
          completedBookings: booking.status === 'completed' ? 1 : 0,
          totalSpent: booking.price || 0,
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalBookings - a.totalBookings);
  }, [bookings]);

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
        <h1 className="text-3xl font-bold text-neutral-900">Clientes</h1>
        <p className="text-neutral-600 mt-2">Base de dados de clientes</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Agendamentos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Concluídos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Total Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 text-sm font-medium">{customer.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <div>{customer.email || '-'}</div>
                    {customer.phone && <div className="text-neutral-500">{customer.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm">{customer.totalBookings}</td>
                  <td className="px-6 py-4 text-sm">{customer.completedBookings}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.totalSpent / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="p-8 text-center text-neutral-500">
              Nenhum cliente encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

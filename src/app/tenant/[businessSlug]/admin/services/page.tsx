'use client';

import { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useServices, useCreateService, useUpdateService } from '@/lib/queries/services';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { Service } from '@/types/business';

export default function AdminServicesPage() {
  const { business } = useBusiness();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const { data: services, isLoading } = useServices(business.id, { active: true });
  const createService = useCreateService(business.id);
  const updateService = useUpdateService(business.id);

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingService(null);
  };

  const handleSubmit = async (data: Partial<Service>) => {
    if (editingService) {
      await updateService.mutateAsync({
        serviceId: editingService.id,
        updates: data,
      });
    } else {
      await createService.mutateAsync(data as any);
    }
    handleClose();
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
          <h1 className="text-3xl font-bold text-neutral-900">Serviços</h1>
          <p className="text-neutral-600 mt-2">Gerencie o catálogo de serviços</p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          + Novo Serviço
        </button>
      </div>

      {isFormOpen && (
        <ServiceForm
          service={editingService || undefined}
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services?.map((service) => (
          <div
            key={service.id}
            className="rounded-lg border border-neutral-200 bg-white p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold">{service.name}</h3>
            <p className="text-sm text-neutral-600 mt-1">{service.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Preço</p>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price / 100)}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Duração</p>
                <p className="text-lg font-semibold">{service.durationMinutes} min</p>
              </div>
            </div>
            <button
              onClick={() => handleEdit(service)}
              className="mt-4 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Editar
            </button>
          </div>
        ))}

        {services?.length === 0 && (
          <div className="col-span-full p-8 text-center text-neutral-500">
            Nenhum serviço cadastrado. Crie o primeiro serviço!
          </div>
        )}
      </div>
    </div>
  );
}

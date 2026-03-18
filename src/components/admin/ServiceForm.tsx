'use client';

import { useState, useEffect } from 'react';
import { Service } from '@/types/business';
import { useProfessionals } from '@/lib/queries/professionals';
import { useBusiness } from '@/lib/contexts/BusinessContext';

interface ServiceFormProps {
  service?: Service;
  categories?: { id: string; name: string }[];
  onSubmit: (data: Partial<Service>) => void;
  onCancel: () => void;
}

export function ServiceForm({ service, categories = [], onSubmit, onCancel }: ServiceFormProps) {
  const { business } = useBusiness();
  const { data: professionals } = useProfessionals(business.id);

  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    category: service?.category || '',
    price: service ? (service.price / 100).toString() : '',
    durationMinutes: service?.durationMinutes || 30,
    professionalIds: service?.professionalIds || [],
    active: service?.active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: Math.round(parseFloat(formData.price) * 100),
      currency: business.settings.currency || 'BRL',
    });
  };

  const toggleProfessional = (professionalId: string) => {
    setFormData((prev) => ({
      ...prev,
      professionalIds: prev.professionalIds.includes(professionalId)
        ? prev.professionalIds.filter((id) => id !== professionalId)
        : [...prev.professionalIds, professionalId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{service ? 'Editar Serviço' : 'Novo Serviço'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nome do Serviço</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Categoria</label>
              {categories.length > 0 ? (
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                >
                  <option value="">Nenhuma</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  placeholder="Ex: Corte, Coloração"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Duração (minutos)</label>
              <input
                type="number"
                required
                min="1"
                value={formData.durationMinutes}
                onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Preço (R$)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Profissionais</label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-neutral-200 rounded-lg p-3">
              {professionals?.map((professional) => (
                <label key={professional.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.professionalIds.includes(professional.id)}
                    onChange={() => toggleProfessional(professional.id)}
                    className="rounded border-neutral-300"
                  />
                  <span className="text-sm">{professional.name}</span>
                </label>
              ))}
              {professionals?.length === 0 && (
                <p className="text-sm text-neutral-500">Nenhum profissional cadastrado</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
              className="rounded border-neutral-300"
              id="active"
            />
            <label htmlFor="active" className="text-sm font-medium text-neutral-700 cursor-pointer">
              Serviço ativo
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              {service ? 'Salvar Alterações' : 'Criar Serviço'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Service, ServiceInventoryItem } from '@/types/business';
import { useProfessionals } from '@/lib/queries/professionals';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { InventoryItem } from '@/types/inventory';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';

interface ServiceFormProps {
  service?: Service;
  categories?: { id: string; name: string }[];
  onSubmit: (data: Partial<Service>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function ServiceForm({
  service,
  categories = [],
  onSubmit,
  onCancel,
  onDelete,
  isDeleting = false,
}: ServiceFormProps) {
  const { business } = useBusiness();
  const { data: professionals } = useProfessionals(business.id);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    category: service?.category || '',
    price: service ? (service.price / 100).toString() : '',
    durationMinutes: service?.durationMinutes || 30,
    professionalIds: service?.professionalIds || [],
    active: service?.active ?? true,
    inventoryItems: (service?.inventoryItems ?? []) as ServiceInventoryItem[],
  });

  useEffect(() => {
    if (!business?.id) return;
    (async () => {
      try {
        const r = await fetch(`/api/inventory?businessId=${business.id}`, {
          headers: await getAuthHeaders(),
        });
        const d = await r.json();
        setInventoryItems(d.items ?? []);
      } catch {
        setInventoryItems([]);
      }
    })();
  }, [business?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: Math.round(parseFloat(formData.price) * 100),
      currency: business.settings.currency || 'BRL',
      inventoryItems: formData.inventoryItems,
    });
  };

  const addInventoryItem = () => {
    const existing = formData.inventoryItems.map((i) => i.inventoryItemId);
    const available = inventoryItems.find((i) => !existing.includes(i.id));
    if (!available) return;
    setFormData((prev) => ({
      ...prev,
      inventoryItems: [
        ...prev.inventoryItems,
        {
          inventoryItemId: available.id,
          inventoryItemName: available.name,
          quantity: 1,
          unit: available.unit,
        },
      ],
    }));
  };

  const updateInventoryItem = (index: number, field: keyof ServiceInventoryItem, value: string | number) => {
    setFormData((prev) => {
      const next = [...prev.inventoryItems];
      const item = next[index];
      if (!item) return prev;
      if (field === 'inventoryItemId') {
        const inv = inventoryItems.find((i) => i.id === value);
        next[index] = {
          ...item,
          inventoryItemId: value as string,
          inventoryItemName: inv?.name,
          quantity: item.quantity,
          unit: inv?.unit,
        };
      } else if (field === 'quantity') {
        next[index] = { ...item, quantity: Number(value) || 0 };
      }
      return { ...prev, inventoryItems: next };
    });
  };

  const removeInventoryItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.filter((_, i) => i !== index),
    }));
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

          {/* Produtos do estoque (opcional) */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-2">
              Produtos do estoque (opcional)
            </h3>
            <p className="text-xs text-neutral-500 mb-3">
              Vincule produtos do estoque e informe a quantidade necessária para este serviço.
            </p>
            {inventoryItems.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhum produto cadastrado no estoque. Cadastre na aba Estoque para vincular.
              </p>
            ) : (
              <>
                {formData.inventoryItems.map((ing, index) => {
                  const invItem = inventoryItems.find((i) => i.id === ing.inventoryItemId);
                  const displayName = invItem?.name ?? ing.inventoryItemName ?? 'Produto não encontrado';
                  const displayUnit = invItem?.unit ?? ing.unit ?? 'un';
                  return (
                  <div
                    key={`${ing.inventoryItemId}-${index}`}
                    className="flex items-center gap-2 mb-2"
                  >
                    <select
                      value={ing.inventoryItemId}
                      onChange={(e) =>
                        updateInventoryItem(index, 'inventoryItemId', e.target.value)
                      }
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    >
                      {!invItem && (
                        <option value={ing.inventoryItemId}>
                          {displayName} (produto pode ter sido removido)
                        </option>
                      )}
                      {inventoryItems.map((item) => {
                        const used = formData.inventoryItems.some(
                          (x, i) => i !== index && x.inventoryItemId === item.id
                        );
                        return (
                          <option
                            key={item.id}
                            value={item.id}
                            disabled={used}
                          >
                            {item.name} ({item.unit})
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={ing.quantity}
                      onChange={(e) =>
                        updateInventoryItem(index, 'quantity', e.target.value)
                      }
                      placeholder="Qtd"
                      className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-neutral-500 shrink-0">
                      {displayUnit}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeInventoryItem(index)}
                      className="rounded p-2 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                );
                })}
                {formData.inventoryItems.length < inventoryItems.length && (
                  <button
                    type="button"
                    onClick={addInventoryItem}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    + Adicionar produto
                  </button>
                )}
              </>
            )}
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
            {service && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Apagando...' : 'Apagar Serviço'}
              </button>
            )}
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

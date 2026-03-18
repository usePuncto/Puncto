'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useServices, useCreateService, useUpdateService } from '@/lib/queries/services';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { Service } from '@/types/business';
import { MenuCategory } from '@/types/restaurant';
import { MenuCategoryFilter } from '@/components/restaurant/MenuCategoryFilter';

export default function AdminServicesPage() {
  const { business } = useBusiness();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const { data: services, isLoading } = useServices(business.id);

  const loadCategories = () => {
    if (!business?.id) return;
    fetch(`/api/services/categories?businessId=${business.id}`)
      .then((r) => r.json())
      .then((d) => {
        const rawCategories = d.categories ?? [];
        setCategories(
          rawCategories.map((c: any, idx: number) => ({
            id: c.id,
            businessId: c.businessId ?? business.id,
            name: c.name ?? '',
            displayOrder: typeof c.displayOrder === 'number' ? c.displayOrder : idx,
            active: typeof c.active === 'boolean' ? c.active : true,
            createdAt: c.createdAt ?? new Date(),
            updatedAt: c.updatedAt ?? new Date(),
          }))
        );
      })
      .catch(() => setCategories([]));
  };

  useEffect(() => {
    loadCategories();
  }, [business?.id]);

  const handleDeleteCategory = async (category: MenuCategory) => {
    if (!business?.id) return;
    try {
      const res = await fetch(
        `/api/services/categories/${category.id}?businessId=${business.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Erro ao excluir categoria');
      setSelectedCategory((prev) => (prev === category.id ? null : prev));
      loadCategories();
    } catch {
      alert('Erro ao excluir categoria.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    if (!categoryName.trim()) {
      setCategoryError('Nome da categoria é obrigatório');
      return;
    }
    setCategoryLoading(true);
    try {
      const res = await fetch('/api/services/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, name: categoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar categoria');
      setShowCategoryForm(false);
      setCategoryName('');
      loadCategories();
    } catch {
      setCategoryError('Erro ao criar categoria');
    } finally {
      setCategoryLoading(false);
    }
  };

  const filteredServices = selectedCategory
    ? (services ?? []).filter((s) => {
        const cat = categories.find((c) => c.id === selectedCategory);
        return s.category === selectedCategory || (cat && s.category === cat.name);
      })
    : (services ?? []);
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

        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            + Nova Categoria
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            + Novo Serviço
          </button>
        </div>
      </div>

      {showCategoryForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Nova categoria de serviço</h2>
          <form onSubmit={handleCreateCategory} className="space-y-2 max-w-md">
            <div className="flex gap-2">
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Ex: Corte, Coloração, Manicure"
              />
              <button
                type="submit"
                disabled={categoryLoading}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {categoryLoading ? 'Salvando...' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCategoryForm(false); setCategoryName(''); setCategoryError(null); }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
            {categoryError && <p className="text-sm text-red-600">{categoryError}</p>}
          </form>
        </div>
      )}

      {categories.length > 0 && (
        <MenuCategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {isFormOpen && (
        <ServiceForm
          service={editingService || undefined}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => (
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

        {filteredServices.length === 0 && (
          <div className="col-span-full p-8 text-center text-neutral-500">
            {selectedCategory
              ? 'Nenhum serviço nesta categoria.'
              : 'Nenhum serviço cadastrado. Crie o primeiro serviço!'}
          </div>
        )}
      </div>
    </div>
  );
}

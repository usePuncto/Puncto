'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { MenuCard } from '@/components/restaurant/MenuCard';
import { MenuCategoryFilter } from '@/components/restaurant/MenuCategoryFilter';
import { Product, MenuCategory } from '@/types/restaurant';
import { useRouter } from 'next/navigation';

export default function AdminMenuPage() {
  const { business } = useBusiness();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const loadData = async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load products
      const productsRes = await fetch(`/api/menu?businessId=${business.id}`);
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);

      // Load categories
      const categoriesRes = await fetch(`/api/menu/categories?businessId=${business.id}`);
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error('Failed to load menu data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business?.id]);

  const handleEdit = (product: Product) => {
    router.push(`/tenant/admin/menu/${product.id}`);
  };

  const handleCreate = () => {
    router.push('/tenant/admin/menu/new');
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!business?.id) return;
    if (!confirm(`Excluir "${product.name}"?`)) return;
    try {
      const res = await fetch(
        `/api/menu/${product.id}?businessId=${business.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Erro ao excluir produto');
      loadData();
    } catch {
      alert('Erro ao excluir produto.');
    }
  };

  const handleDeleteCategory = async (category: MenuCategory) => {
    if (!business?.id) return;
    try {
      const res = await fetch(
        `/api/menu/categories/${category.id}?businessId=${business.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Erro ao excluir categoria');
      setSelectedCategory((prev) => (prev === category.id ? null : prev));
      loadData();
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
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          category: { name: categoryName.trim(), displayOrder: categories.length, active: true },
        }),
      });
      if (!res.ok) throw new Error('Erro ao criar categoria');
      setShowCategoryForm(false);
      setCategoryName('');
      loadData();
    } catch {
      setCategoryError('Erro ao criar categoria');
    } finally {
      setCategoryLoading(false);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

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
          <h1 className="text-3xl font-bold text-neutral-900">Cardápio</h1>
          <p className="text-neutral-600 mt-2">Gerencie os produtos do menu</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            + Nova Categoria
          </button>
          <button
            onClick={handleCreate}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            + Novo Produto
          </button>
        </div>
      </div>

      {showCategoryForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Nova categoria</h2>
          <form onSubmit={handleCreateCategory} className="space-y-2 max-w-md">
            <div className="flex gap-2">
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Nome da categoria"
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
              onClick={() => { setShowCategoryForm(false); setCategoryError(null); }}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <MenuCard
            key={product.id}
            product={product}
            onEdit={handleEdit}
            onDelete={() => handleDeleteProduct(product)}
          />
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full p-8 text-center text-neutral-500">
            {selectedCategory
              ? 'Nenhum produto nesta categoria.'
              : 'Nenhum produto cadastrado. Crie o primeiro produto!'}
          </div>
        )}
      </div>
    </div>
  );
}

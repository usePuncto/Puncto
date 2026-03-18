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

  useEffect(() => {
    loadData();
  }, [business?.id]);

  const loadData = async () => {
    if (!business?.id) return;

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

  const handleEdit = (product: Product) => {
    router.push(`/tenant/admin/menu/${product.id}`);
  };

  const handleCreate = () => {
    router.push('/tenant/admin/menu/new');
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

        <button
          onClick={handleCreate}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          + Novo Produto
        </button>
      </div>

      {categories.length > 0 && (
        <MenuCategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <MenuCard key={product.id} product={product} onEdit={handleEdit} />
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

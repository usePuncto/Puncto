'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useRouter, useParams } from 'next/navigation';
import { Product, MenuCategory, ProductIngredient } from '@/types/restaurant';
import { InventoryItem } from '@/types/inventory';
import { useForm } from 'react-hook-form';

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  allergens: string[];
  available: boolean;
  preparationTime: number;
  displayOrder: number;
}

export default function ProductEditPage() {
  const { business } = useBusiness();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const isNew = productId === 'new';

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<ProductIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      description: '',
      category: '',
      price: 0,
      imageUrl: '',
      allergens: [],
      available: true,
      preparationTime: 0,
      displayOrder: 0,
    },
  });

  useEffect(() => {
    loadData();
  }, [business?.id, productId]);

  const loadData = async () => {
    if (!business?.id) return;

    try {
      // Load categories
      const categoriesRes = await fetch(`/api/menu/categories?businessId=${business.id}`);
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData.categories || []);

      // Load inventory items (for ingredients - prefer "ingredients" category)
      const invRes = await fetch(`/api/inventory?businessId=${business.id}`);
      const invData = await invRes.json();
      const items = (invData.items || []) as InventoryItem[];
      setInventoryItems(items);

      if (!isNew) {
        // Load product
        const productRes = await fetch(
          `/api/menu/${productId}?businessId=${business.id}`
        );
        const productData = await productRes.json();
        setProduct(productData);

        // Set form values
        setValue('name', productData.name || '');
        setValue('description', productData.description || '');
        setValue('category', productData.category || '');
        setValue('price', productData.price || 0);
        setValue('imageUrl', productData.imageUrl || '');
        setValue('allergens', productData.allergens || []);
        setValue('available', productData.available !== undefined ? productData.available : true);
        setValue('preparationTime', productData.preparationTime || 0);
        setValue('displayOrder', productData.displayOrder || 0);
        setIngredients(productData.ingredients || []);
      } else {
        setIngredients([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;
    setUploadError(null);
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        `/api/menu/upload?businessId=${business.id}`,
        { method: 'POST', body: form }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha no upload');
      }
      const { url } = await res.json();
      setValue('imageUrl', url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const addIngredient = () => {
    const firstItem = inventoryItems[0];
    if (firstItem) {
      setIngredients((prev) => [
        ...prev,
        {
          inventoryItemId: firstItem.id,
          inventoryItemName: firstItem.name,
          quantity: 1,
          unit: firstItem.unit,
        },
      ]);
    }
  };

  const updateIngredient = <T extends keyof ProductIngredient>(
    index: number,
    field: T,
    value: ProductIngredient[T]
  ) => {
    setIngredients((prev) => {
      const next = [...prev];
      next[index][field] = value;

      if (field === 'inventoryItemId') {
        const inventoryItemId = value as ProductIngredient['inventoryItemId'];
        const item = inventoryItems.find((i) => i.id === inventoryItemId);
        if (item) {
          next[index].inventoryItemName = item.name;
          next[index].unit = item.unit;
        }
      }

      return next;
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async () => {
    if (!business?.id || !confirm('Excluir este produto? Essa ação não pode ser desfeita.')) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/menu/${productId}?businessId=${business.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Erro ao excluir');
      router.push('/tenant/admin/menu');
    } catch {
      alert('Erro ao excluir produto.');
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!business?.id) return;

    try {
      setIsSaving(true);

      const productData = {
        ...data,
        price: Math.round(data.price * 100), // Convert to cents
        ingredients,
      };

      if (isNew) {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            product: productData,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to create product');
        }

        const newProduct = await res.json();
        router.push(`/tenant/admin/menu/${newProduct.id}`);
      } else {
        const res = await fetch(`/api/menu/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            updates: productData,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to update product');
        }

        router.push('/tenant/admin/menu');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setIsSaving(false);
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
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-neutral-600 hover:text-neutral-900 mb-4"
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-bold text-neutral-900">
          {isNew ? 'Novo Produto' : 'Editar Produto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Nome do Produto *
              </label>
              <input
                {...register('name', { required: 'Nome é obrigatório' })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                placeholder="Ex: Hambúrguer Artesanal"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Descrição
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                placeholder="Descrição do produto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Categoria *
                </label>
                <select
                  {...register('category', { required: 'Categoria é obrigatória' })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                >
                  <option value="">Selecione...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Preço (R$) *
                </label>
                <input
                  {...register('price', {
                    required: 'Preço é obrigatório',
                    min: { value: 0, message: 'Preço deve ser positivo' },
                  })}
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="text-red-600 text-sm mt-1">{errors.price.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Imagem do Produto
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={!!uploadingImage}
                className="block w-full text-sm text-neutral-700 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {uploadingImage ? 'Enviando...' : 'JPEG, PNG, GIF ou WebP. Máx. 2MB'}
              </p>
              {uploadError && (
                <p className="mt-1 text-sm text-red-600">{uploadError}</p>
              )}
              {watch('imageUrl') && (
                <img
                  src={watch('imageUrl')}
                  alt="Preview"
                  className="mt-2 h-32 w-auto rounded-lg object-cover"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Ingredientes (vinculados ao estoque)
              </label>
              {inventoryItems.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Nenhum item no estoque. Adicione itens em Estoque para vincular.
                </p>
              ) : (
                <>
                  <div className="space-y-2 mb-2">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={ing.inventoryItemId}
                          onChange={(e) =>
                            updateIngredient(idx, 'inventoryItemId', e.target.value)
                          }
                          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        >
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={ing.quantity}
                          onChange={(e) =>
                            updateIngredient(
                              idx,
                              'quantity',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                          placeholder="Qtd"
                        />
                        <span className="text-sm text-neutral-500 w-12">{ing.unit || 'un'}</span>
                        <button
                          type="button"
                          onClick={() => removeIngredient(idx)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Remover"
                          aria-label="Remover ingrediente"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="text-sm text-neutral-600 hover:text-neutral-900 border border-dashed border-neutral-300 rounded-lg px-3 py-2"
                  >
                    + Adicionar ingrediente
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tempo de Preparo (min)
                </label>
                <input
                  {...register('preparationTime', { min: 0 })}
                  type="number"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Ordem de Exibição
                </label>
                <input
                  {...register('displayOrder', { min: 0 })}
                  type="number"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  {...register('available')}
                  type="checkbox"
                  className="rounded border-neutral-300"
                />
                <span className="text-sm font-medium text-neutral-700">
                  Produto disponível
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <div>
            {!isNew && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir produto'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

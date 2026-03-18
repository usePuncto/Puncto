'use client';

import { Product } from '@/types/restaurant';
import Image from 'next/image';

interface MenuCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function MenuCard({ product, onEdit, onDelete }: MenuCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      {product.imageUrl && (
        <div className="relative h-48 w-full bg-neutral-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          {!product.available && (
            <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
              Indisponível
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-neutral-900">{formatPrice(product.price)}</p>
            {product.category && (
              <p className="text-xs text-neutral-500 mt-1">{product.category}</p>
            )}
          </div>
          {product.allergens && product.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.allergens.map((allergen) => (
                <span
                  key={allergen}
                  className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800"
                >
                  {allergen}
                </span>
              ))}
            </div>
          )}
        </div>

        {product.preparationTime && (
          <p className="text-xs text-neutral-500 mt-2">
            ⏱️ {product.preparationTime} min
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onEdit(product)}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Editar
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(product)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

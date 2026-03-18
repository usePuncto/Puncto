'use client';

import { MenuCategory } from '@/types/restaurant';

interface MenuCategoryFilterProps {
  categories: MenuCategory[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onDeleteCategory?: (category: MenuCategory) => void;
}

export function MenuCategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  onDeleteCategory,
}: MenuCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelectCategory(null)}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          selectedCategory === null
            ? 'bg-neutral-900 text-white'
            : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
        }`}
      >
        Todos
      </button>
      {categories.map((category) => (
        <div
          key={category.id}
          className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            selectedCategory === category.id
              ? 'bg-neutral-900 text-white'
              : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className="pr-1"
          >
            {category.name}
          </button>
          {onDeleteCategory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Excluir categoria "${category.name}"?`)) {
                  onDeleteCategory(category);
                }
              }}
              className="rounded p-0.5 hover:bg-neutral-700/30 text-neutral-400 hover:text-red-400"
              title="Excluir categoria"
              aria-label={`Excluir ${category.name}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

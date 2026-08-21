'use client';

type MockRow = {
  cells: string[];
  badge?: string;
  badgeTone?: 'neutral' | 'green' | 'amber' | 'blue';
};

type ModuleMockupProps = {
  title: string;
  subtitle: string;
  moduleId: string;
  upcoming: string[];
  stats: { label: string; value: string }[];
  columns: string[];
  rows: MockRow[];
  primaryAction?: string;
};

const badgeClass: Record<NonNullable<MockRow['badgeTone']>, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
};

/**
 * Shared visual scaffold for modules not yet fully implemented.
 * Controls are disabled — UI preview only.
 */
export function ModuleMockup({
  title,
  subtitle,
  moduleId,
  upcoming,
  stats,
  columns,
  rows,
  primaryAction = 'Novo',
}: ModuleMockupProps) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
            Mockup · módulo <code className="font-mono">{moduleId}</code>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">{title}</h1>
          <p className="mt-2 max-w-2xl text-neutral-600">{subtitle}</p>
        </div>
        <button
          type="button"
          disabled
          title="Disponível na implementação completa"
          className="cursor-not-allowed rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-50"
        >
          {primaryAction}
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
        <p className="text-sm font-medium text-neutral-800">Próximas entregas deste módulo</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
          {upcoming.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <p className="text-sm font-medium text-neutral-800">Pré-visualização com dados de exemplo</p>
          <span className="text-xs text-neutral-400">Somente leitura</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium text-neutral-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row, idx) => (
                <tr key={idx} className="opacity-90">
                  {row.cells.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-3 text-neutral-700">
                      {cellIdx === columns.length - 1 && row.badge ? (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            badgeClass[row.badgeTone || 'neutral']
                          }`}
                        >
                          {row.badge}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">
        Interface provisória para validação de produto. A lógica de negócio será conectada em uma
        próxima etapa.
      </p>
    </div>
  );
}

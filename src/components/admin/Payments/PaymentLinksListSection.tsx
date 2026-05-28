'use client';

import type { PaymentLink } from '@/types/payment';

type Props = {
  title: string;
  description: string;
  emptyMessage: string;
  links: PaymentLink[];
  loading: boolean;
  customerLabelById: Record<string, string>;
  hasSucceededPaymentByLinkId: Set<string>;
  linkListPage: number;
  linksPerPage: number;
  linkListTotal: number;
  linkListTotalPages: number;
  linkActionLoading: boolean;
  onSetLinksPerPage: (n: number) => void;
  onSetLinkListPage: (fn: (p: number) => number) => void;
  onLinkCustomer: (link: PaymentLink) => void;
  onCancelLink: (link: PaymentLink) => void;
  onCopy: (url: string) => void;
  formatAmount: (amount: number, currency: string) => string;
  isLinkExpired: (link: { expiresAt?: unknown }) => boolean;
  getExpiresAtDate: (value: unknown) => Date | null;
};

export function PaymentLinksListSection({
  title,
  description,
  emptyMessage,
  links,
  loading,
  customerLabelById,
  hasSucceededPaymentByLinkId,
  linkListPage,
  linksPerPage,
  linkListTotal,
  linkListTotalPages,
  linkActionLoading,
  onSetLinksPerPage,
  onSetLinkListPage,
  onLinkCustomer,
  onCancelLink,
  onCopy,
  formatAmount,
  isLinkExpired,
  getExpiresAtDate,
}: Props) {
  const start = (linkListPage - 1) * linksPerPage;
  const paginatedLinks = links.slice(start, start + linksPerPage);

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        <p className="mt-0.5 text-sm text-neutral-600">{description}</p>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
            <p className="mt-3 text-sm">Carregando…</p>
          </div>
        ) : links.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="pb-3 pr-4 font-medium">Nome</th>
                  <th className="pb-3 pr-4 font-medium">Valor</th>
                  <th className="pb-3 pr-4 font-medium">Expira em</th>
                  <th className="pb-3 pr-4 font-medium">Aluno</th>
                  <th className="pb-3 pr-4 font-medium">Situação</th>
                  <th className="pb-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedLinks.map((link) => {
                  const expired = isLinkExpired(link);
                  const paid =
                    Boolean(link.paidAt) || hasSucceededPaymentByLinkId.has(link.stripePaymentLinkId);
                  const disabled = !link.active || expired || paid;
                  const expiresAtDate = getExpiresAtDate(link.expiresAt);
                  const cancelled = Boolean(link.cancelledAt) || (!link.active && !paid);
                  return (
                    <tr key={link.id} className="hover:bg-neutral-50/80">
                      <td className="py-3.5 pr-4 align-middle">
                        <span className="font-medium text-neutral-900">{link.name}</span>
                      </td>
                      <td className="py-3.5 pr-4 align-middle tabular-nums text-neutral-800">
                        {formatAmount(link.amount, link.currency)}
                      </td>
                      <td className="py-3.5 pr-4 align-middle text-neutral-600">
                        {expiresAtDate ? expiresAtDate.toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-3.5 pr-4 align-middle text-neutral-700">
                        {link.linkedCustomerId
                          ? (customerLabelById[link.linkedCustomerId] ?? link.linkedCustomerId)
                          : '—'}
                      </td>
                      <td className="py-3.5 pr-4 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {paid && (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              Pago
                            </span>
                          )}
                          {cancelled ? (
                            <span className="inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-800">
                              Cancelado
                            </span>
                          ) : expired ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              Expirado
                            </span>
                          ) : paid ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              Pago
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                              Aguardando
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-right align-middle">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onLinkCustomer(link)}
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                          >
                            Aluno
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelLink(link)}
                            disabled={!link.active || linkActionLoading || paid}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(link.stripePaymentLinkUrl, '_blank')}
                            disabled={disabled}
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopy(link.stripePaymentLinkUrl)}
                            disabled={disabled}
                            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Copiar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && links.length > 0 && (
          <div className="mt-5 flex flex-col gap-4 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-600">
              Mostrando{' '}
              <strong>{linkListTotal === 0 ? 0 : (linkListPage - 1) * linksPerPage + 1}</strong>–
              <strong>{Math.min(linkListPage * linksPerPage, linkListTotal)}</strong> de{' '}
              <strong>{linkListTotal}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <span className="whitespace-nowrap">Por página</span>
                <select
                  value={linksPerPage}
                  onChange={(e) => onSetLinksPerPage(Number(e.target.value))}
                  className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSetLinkListPage((p) => Math.max(1, p - 1))}
                  disabled={linkListPage <= 1}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="px-2 text-sm text-neutral-600">
                  {linkListPage} / {linkListTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => onSetLinkListPage((p) => Math.min(linkListTotalPages, p + 1))}
                  disabled={linkListPage >= linkListTotalPages}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import {
  formatBillingIntervalLabel,
  formatBrlFromCents,
  formatDueDate,
  formatPlanPeriod,
  getEffectiveInstallmentStatus,
  getNextChargeDisplay,
} from '@/lib/queries/manualTuitions';
import type { ManualTuitionEnrollment, ManualTuitionInstallment } from '@/types/manualTuition';

export const MANUAL_TUITION_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: 'Pago', className: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-800' },
  overdue: { label: 'Em atraso', className: 'bg-red-100 text-red-800' },
};

const SCHEDULED_STATUS = {
  label: 'Prevista',
  className: 'bg-neutral-100 text-neutral-700',
};

function InstallmentRow({
  installment,
  onTogglePaid,
  loading,
}: {
  installment: ManualTuitionInstallment;
  onTogglePaid: (id: string, paid: boolean) => void;
  loading: boolean;
}) {
  const status = getEffectiveInstallmentStatus(installment);
  const badge = MANUAL_TUITION_STATUS_LABELS[status] ?? MANUAL_TUITION_STATUS_LABELS.pending;

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 px-4 whitespace-nowrap text-neutral-600">
        {installment.installmentNumber}ª cobrança
      </td>
      <td className="py-2 px-4 whitespace-nowrap">{formatDueDate(installment.dueDate)}</td>
      <td className="py-2 px-4 font-medium">{formatBrlFromCents(installment.amountCents)}</td>
      <td className="py-2 px-4">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </td>
      <td className="py-2 px-4 text-right">
        {status === 'paid' ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => onTogglePaid(installment.id, false)}
            className="text-xs text-neutral-600 hover:text-neutral-900 underline disabled:opacity-50"
          >
            Desfazer pagamento
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => onTogglePaid(installment.id, true)}
            className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Marcar como pago
          </button>
        )}
      </td>
    </tr>
  );
}

export function EnrollmentCard({
  enrollment,
  installments,
  onCancel,
  onDelete,
  onTogglePaid,
  actionLoading,
  hideCustomerColumn = false,
  alwaysExpanded = false,
}: {
  enrollment: ManualTuitionEnrollment;
  installments: ManualTuitionInstallment[];
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, paid: boolean) => void;
  actionLoading: boolean;
  hideCustomerColumn?: boolean;
  alwaysExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const showDetails = alwaysExpanded || expanded;

  const summary = useMemo(() => {
    let paid = 0;
    let overdue = 0;
    let pending = 0;
    for (const inst of installments) {
      const s = getEffectiveInstallmentStatus(inst);
      if (s === 'paid') paid++;
      else if (s === 'overdue') overdue++;
      else pending++;
    }
    return { paid, overdue, pending, total: installments.length };
  }, [installments]);

  const overallStatus =
    summary.overdue > 0 ? 'overdue' : summary.pending > 0 ? 'pending' : 'paid';
  const badge = MANUAL_TUITION_STATUS_LABELS[overallStatus];
  const nextCharge = getNextChargeDisplay(enrollment, installments);
  const nextBadge =
    nextCharge.status && nextCharge.status !== 'scheduled'
      ? MANUAL_TUITION_STATUS_LABELS[nextCharge.status]
      : SCHEDULED_STATUS;
  const detailColSpan = hideCustomerColumn ? 5 : 6;

  return (
    <>
      <tr className="border-b border-neutral-100 bg-white hover:bg-neutral-50/80">
        {!hideCustomerColumn && (
          <td className="py-3 pr-4 font-medium text-neutral-900">{enrollment.customerName}</td>
        )}
        <td className="py-3 pr-4 text-neutral-600">{enrollment.planName}</td>
        <td className="py-3 pr-4">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </td>
        <td className="py-3 pr-4 whitespace-nowrap">
          <div className="flex flex-col gap-1">
            <span className="text-neutral-900">{nextCharge.label}</span>
            <span
              className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-medium ${nextBadge.className}`}
            >
              {nextBadge.label}
            </span>
          </div>
        </td>
        <td className="py-3 pr-4 font-medium whitespace-nowrap">
          {formatBrlFromCents(enrollment.installmentAmountCents)}
        </td>
        <td className="py-3 text-right whitespace-nowrap">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!alwaysExpanded && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {expanded ? 'Ocultar' : 'Detalhes'}
              </button>
            )}
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => {
                if (window.confirm('Encerrar este plano? Cobranças não pagas serão removidas.')) {
                  onCancel(enrollment.id);
                }
              }}
              className="rounded-md border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              Encerrar
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => {
                if (
                  window.confirm(
                    'Excluir permanentemente este plano e todas as cobranças? Esta ação não pode ser desfeita.',
                  )
                ) {
                  onDelete(enrollment.id);
                }
              }}
              className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Excluir
            </button>
          </div>
        </td>
      </tr>
      {showDetails && (
        <tr className="border-b border-neutral-200 bg-neutral-50/50">
          <td colSpan={detailColSpan} className="p-4">
            <p className="text-sm text-neutral-500 mb-3">
              {formatPlanPeriod(enrollment)}
              {' · '}
              {formatBrlFromCents(enrollment.installmentAmountCents)} por mensalidade
              {enrollment.firstInstallmentAmountCents != null &&
                enrollment.firstInstallmentAmountCents !== enrollment.installmentAmountCents && (
                  <>
                    {' · '}
                    1ª cobrança: {formatBrlFromCents(enrollment.firstInstallmentAmountCents)}
                  </>
                )}
              {enrollment.firstInstallmentDueDate && (
                <>
                  {' · '}
                  1º vencimento:{' '}
                  {formatDueDate(new Date(enrollment.firstInstallmentDueDate + 'T12:00:00'))}
                </>
              )}
              {' · '}
              {formatBillingIntervalLabel(enrollment.billingCycleMonths)}
              {' · '}
              vencimento dia {enrollment.dueDayOfMonth}
              {summary.overdue > 0 && ` · ${summary.overdue} em atraso`}
              {' · '}
              {summary.paid}/{summary.total} pagas
            </p>
            {enrollment.notes && (
              <p className="text-xs text-neutral-500 mb-3 italic">{enrollment.notes}</p>
            )}
            {installments.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-neutral-500">
                      <th className="py-2 px-4">Cobrança</th>
                      <th className="py-2 px-4">Vencimento</th>
                      <th className="py-2 px-4">Valor</th>
                      <th className="py-2 px-4">Status</th>
                      <th className="py-2 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst) => (
                      <InstallmentRow
                        key={inst.id}
                        installment={inst}
                        onTogglePaid={onTogglePaid}
                        loading={actionLoading}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Nenhuma cobrança registrada ainda.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

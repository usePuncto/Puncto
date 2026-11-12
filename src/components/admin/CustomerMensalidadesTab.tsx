'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  formatBrlFromCents,
  getEffectiveInstallmentStatus,
  toDate,
  useManualTuitionEnrollments,
  useManualTuitionInstallments,
  useManualTuitionMutations,
} from '@/lib/queries/manualTuitions';
import { TUITION_DUE_REMINDER_DAYS } from '@/lib/manualTuition/billingDates';
import type { ManualTuitionInstallment } from '@/types/manualTuition';
import { EnrollmentCard } from '@/components/admin/financial/ManualTuitionEnrollmentCards';

interface CustomerMensalidadesTabProps {
  businessId: string;
  customerId: string;
}

export function CustomerMensalidadesTab({ businessId, customerId }: CustomerMensalidadesTabProps) {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useManualTuitionEnrollments(
    businessId,
    true,
  );
  const { data: installments = [], isLoading: installmentsLoading } = useManualTuitionInstallments(
    businessId,
    true,
  );
  const mutations = useManualTuitionMutations(businessId);

  const runManualTuitionSync = useCallback(async () => {
    if (!businessId || !firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      await fetch('/api/manual-tuitions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId }),
      });
      queryClient.invalidateQueries({ queryKey: ['manualTuitionInstallments', businessId] });
      queryClient.invalidateQueries({ queryKey: ['manualTuitionEnrollments', businessId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', businessId] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', businessId] });
    } catch (err) {
      console.error('[CustomerMensalidadesTab] sync failed:', err);
    }
  }, [businessId, firebaseUser, queryClient]);

  useEffect(() => {
    runManualTuitionSync();
  }, [runManualTuitionSync]);

  const customerEnrollments = useMemo(
    () => enrollments.filter((e) => e.customerId === customerId),
    [enrollments, customerId],
  );

  /** Só cobranças de planos ativos (encerrar plano mantém pagas no Firestore, mas o enrollment some da lista). */
  const activeEnrollmentIds = useMemo(
    () => new Set(customerEnrollments.map((e) => e.id)),
    [customerEnrollments],
  );

  const customerInstallments = useMemo(
    () =>
      installments.filter(
        (i) => i.customerId === customerId && activeEnrollmentIds.has(i.enrollmentId),
      ),
    [installments, customerId, activeEnrollmentIds],
  );

  const installmentsByEnrollment = useMemo(() => {
    const map = new Map<string, ManualTuitionInstallment[]>();
    for (const inst of customerInstallments) {
      const list = map.get(inst.enrollmentId) ?? [];
      list.push(inst);
      map.set(inst.enrollmentId, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.installmentNumber - b.installmentNumber);
    }
    return map;
  }, [customerInstallments]);

  const stats = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let pending = 0;
    let paid = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inReminderWindow = new Date(today);
    inReminderWindow.setDate(inReminderWindow.getDate() + TUITION_DUE_REMINDER_DAYS);

    for (const inst of customerInstallments) {
      const status = getEffectiveInstallmentStatus(inst);
      if (status === 'paid') {
        paid++;
        continue;
      }
      if (status === 'overdue') {
        overdue++;
        continue;
      }
      pending++;
      const due = toDate(inst.dueDate);
      const dueDay = new Date(due);
      dueDay.setHours(0, 0, 0, 0);
      if (dueDay >= today && dueDay <= inReminderWindow) dueSoon++;
    }
    return { overdue, dueSoon, pending, paid, total: customerInstallments.length };
  }, [customerInstallments]);

  const actionLoading =
    mutations.markInstallmentPaid.isPending ||
    mutations.cancelEnrollment.isPending ||
    mutations.deleteEnrollment.isPending;

  const handleTogglePaid = (installmentId: string, paid: boolean) => {
    mutations.markInstallmentPaid.mutate({ installmentId, paid });
  };

  const isLoading = enrollmentsLoading || installmentsLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-1">
          {(
            [
              { key: 'overdue', label: 'Em atraso', value: stats.overdue },
              { key: 'pending', label: 'Pendentes', value: stats.pending },
              { key: 'paid', label: 'Pagas', value: stats.paid },
              { key: 'dueSoon', label: 'Vencem em breve', value: stats.dueSoon },
            ] as const
          ).map((stat) => (
            <div
              key={stat.key}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
            >
              <p className="text-xs text-neutral-500">{stat.label}</p>
              <p className="text-lg font-semibold text-neutral-900">{stat.value}</p>
            </div>
          ))}
        </div>
        <Link
          href="/tenant/admin/financial"
          className="shrink-0 text-sm text-neutral-600 underline hover:text-neutral-900"
        >
          Gerenciar em Financeiro
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto" />
        </div>
      ) : customerEnrollments.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                <th className="py-3 px-4 font-medium">Plano</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Próxima cobrança</th>
                <th className="py-3 px-4 font-medium">Mensalidade</th>
                <th className="py-3 px-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customerEnrollments.map((enrollment) => (
                <EnrollmentCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  installments={installmentsByEnrollment.get(enrollment.id) ?? []}
                  onCancel={(id) => mutations.cancelEnrollment.mutate(id)}
                  onDelete={(id) => mutations.deleteEnrollment.mutate(id)}
                  onTogglePaid={handleTogglePaid}
                  actionLoading={actionLoading}
                  hideCustomerColumn
                  alwaysExpanded
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-neutral-500 py-6 text-sm text-center">
          Nenhuma mensalidade cadastrada para este aluno. Cadastre em Financeiro → Mensalidades.
        </p>
      )}

      {customerInstallments.length > 0 && (
        <p className="text-xs text-neutral-500">
          Total em cobranças:{' '}
          {formatBrlFromCents(customerInstallments.reduce((sum, i) => sum + i.amountCents, 0))}
        </p>
      )}
    </div>
  );
}

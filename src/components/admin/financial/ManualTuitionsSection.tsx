'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCustomers } from '@/lib/queries/customers';
import {
  buildPlanName,
  formatBillingIntervalLabel,
  formatBrlFromCents,
  formatDueDate,
  formatPlanPeriod,
  getEffectiveInstallmentStatus,
  getNextChargeDisplay,
  toDate,
  useManualTuitionEnrollments,
  useManualTuitionInstallments,
  useManualTuitionMutations,
} from '@/lib/queries/manualTuitions';
import { TUITION_DUE_REMINDER_DAYS, computePlanEndDateStr } from '@/lib/manualTuition/billingDates';
import type { ManualTuitionEnrollment, ManualTuitionInstallment } from '@/types/manualTuition';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: 'Pago', className: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-800' },
  overdue: { label: 'Em atraso', className: 'bg-red-100 text-red-800' },
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
  const badge = STATUS_LABELS[status] ?? STATUS_LABELS.pending;

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

const SCHEDULED_STATUS = {
  label: 'Prevista',
  className: 'bg-neutral-100 text-neutral-700',
};

function EnrollmentCard({
  enrollment,
  installments,
  onCancel,
  onDelete,
  onTogglePaid,
  actionLoading,
}: {
  enrollment: ManualTuitionEnrollment;
  installments: ManualTuitionInstallment[];
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, paid: boolean) => void;
  actionLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

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
  const badge = STATUS_LABELS[overallStatus];
  const nextCharge = getNextChargeDisplay(enrollment, installments);
  const nextBadge =
    nextCharge.status && nextCharge.status !== 'scheduled'
      ? STATUS_LABELS[nextCharge.status]
      : SCHEDULED_STATUS;

  return (
    <>
      <tr className="border-b border-neutral-100 bg-white hover:bg-neutral-50/80">
        <td className="py-3 pr-4 font-medium text-neutral-900">{enrollment.customerName}</td>
        <td className="py-3 pr-4 text-neutral-600">{enrollment.planName}</td>
        <td className="py-3 pr-4">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </td>
        <td className="py-3 pr-4 whitespace-nowrap">
          <div className="flex flex-col gap-1">
            <span className="text-neutral-900">{nextCharge.label}</span>
            <span className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-medium ${nextBadge.className}`}>
              {nextBadge.label}
            </span>
          </div>
        </td>
        <td className="py-3 pr-4 font-medium whitespace-nowrap">
          {formatBrlFromCents(enrollment.installmentAmountCents)}
        </td>
        <td className="py-3 text-right whitespace-nowrap">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {expanded ? 'Ocultar' : 'Detalhes'}
            </button>
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
      {expanded && (
        <tr className="border-b border-neutral-200 bg-neutral-50/50">
          <td colSpan={6} className="p-4">
            <p className="text-sm text-neutral-500 mb-3">
              {formatPlanPeriod(enrollment)}
              {' · '}
              {formatBrlFromCents(enrollment.installmentAmountCents)} por mensalidade
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

export function ManualTuitionsSection() {
  const { business } = useBusiness();
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useCustomers(business.id);
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useManualTuitionEnrollments(
    business.id,
    true,
  );
  const { data: installments = [], isLoading: installmentsLoading } = useManualTuitionInstallments(
    business.id,
    true,
  );
  const mutations = useManualTuitionMutations(business.id);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'pending' | 'paid'>('all');
  const [searchName, setSearchName] = useState('');
  const [form, setForm] = useState({
    customerId: '',
    billingCycleMonths: '1',
    frequencyPerWeek: '2',
    installmentAmountBrl: '',
    planDurationMonths: '12',
    startDate: new Date().toISOString().split('T')[0],
    dueDayOfMonth: '10',
    notes: '',
  });

  const formPlanEndPreview = useMemo(() => {
    const months = parseInt(form.planDurationMonths, 10);
    if (!form.startDate || isNaN(months) || months < 1) return null;
    return computePlanEndDateStr(form.startDate, months);
  }, [form.startDate, form.planDurationMonths]);

  const runManualTuitionSync = useCallback(async () => {
    if (!business?.id || !firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      await fetch('/api/manual-tuitions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId: business.id }),
      });
      queryClient.invalidateQueries({ queryKey: ['manualTuitionInstallments', business.id] });
      queryClient.invalidateQueries({ queryKey: ['manualTuitionEnrollments', business.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', business.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', business.id] });
    } catch (err) {
      console.error('[ManualTuitionsSection] sync failed:', err);
    }
  }, [business?.id, firebaseUser, queryClient]);

  useEffect(() => {
    runManualTuitionSync();
  }, [runManualTuitionSync]);

  const installmentsByEnrollment = useMemo(() => {
    const map = new Map<string, ManualTuitionInstallment[]>();
    for (const inst of installments) {
      const list = map.get(inst.enrollmentId) ?? [];
      list.push(inst);
      map.set(inst.enrollmentId, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.installmentNumber - b.installmentNumber);
    }
    return map;
  }, [installments]);

  const stats = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let pending = 0;
    let paid = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inReminderWindow = new Date(today);
    inReminderWindow.setDate(inReminderWindow.getDate() + TUITION_DUE_REMINDER_DAYS);

    for (const inst of installments) {
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
    return { overdue, dueSoon, pending, paid, total: installments.length };
  }, [installments]);

  const filteredEnrollments = useMemo(() => {
    const normalizedSearch = searchName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

    let list = enrollments;

    if (filterStatus !== 'all') {
      list = list.filter((e) => {
        const insts = installmentsByEnrollment.get(e.id) ?? [];
        if (insts.length === 0) return false;
        if (filterStatus === 'paid') {
          return insts.every((i) => getEffectiveInstallmentStatus(i) === 'paid');
        }
        if (filterStatus === 'overdue') {
          return insts.some((i) => getEffectiveInstallmentStatus(i) === 'overdue');
        }
        if (filterStatus === 'pending') {
          return insts.some((i) => getEffectiveInstallmentStatus(i) === 'pending');
        }
        return true;
      });
    }

    if (normalizedSearch) {
      list = list.filter((e) =>
        e.customerName
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .includes(normalizedSearch),
      );
    }

    return list;
  }, [enrollments, filterStatus, installmentsByEnrollment, searchName]);

  const actionLoading =
    mutations.createEnrollment.isPending ||
    mutations.markInstallmentPaid.isPending ||
    mutations.cancelEnrollment.isPending ||
    mutations.deleteEnrollment.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.customerId) {
      setFormError('Selecione um aluno');
      return;
    }

    const billingCycleMonths = parseInt(form.billingCycleMonths, 10);
    const frequencyPerWeek = parseInt(form.frequencyPerWeek, 10);
    const planDurationMonths = parseInt(form.planDurationMonths, 10);
    const dueDayOfMonth = parseInt(form.dueDayOfMonth, 10);
    const installmentAmount = parseFloat(form.installmentAmountBrl.replace(',', '.'));

    if (isNaN(billingCycleMonths) || billingCycleMonths < 1 || billingCycleMonths > 24) {
      setFormError('Ciclo de cobrança deve ser entre 1 e 24 meses');
      return;
    }
    if (isNaN(planDurationMonths) || planDurationMonths < 1 || planDurationMonths > 120) {
      setFormError('Duração do plano deve ser entre 1 e 120 meses');
      return;
    }
    if (isNaN(frequencyPerWeek) || frequencyPerWeek < 1 || frequencyPerWeek > 7) {
      setFormError('Frequência deve ser entre 1 e 7 vezes por semana');
      return;
    }
    if (isNaN(installmentAmount) || installmentAmount <= 0) {
      setFormError('Valor da mensalidade inválido');
      return;
    }
    if (isNaN(dueDayOfMonth) || dueDayOfMonth < 1 || dueDayOfMonth > 28) {
      setFormError('Dia de vencimento deve ser entre 1 e 28');
      return;
    }

    const customer = customers.find((c) => c.id === form.customerId);
    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`.trim() || customer.email || customer.id
      : form.customerId;

    try {
      await mutations.createEnrollment.mutateAsync({
        customerId: form.customerId,
        customerName,
        billingCycleMonths,
        frequencyPerWeek,
        installmentAmountCents: Math.round(installmentAmount * 100),
        planDurationMonths,
        startDate: form.startDate,
        dueDayOfMonth,
        planName: buildPlanName(billingCycleMonths, frequencyPerWeek, planDurationMonths),
        notes: form.notes.trim() || undefined,
      });
      setShowForm(false);
      setForm({
        customerId: '',
        billingCycleMonths: '1',
        frequencyPerWeek: '2',
        installmentAmountBrl: '',
        planDurationMonths: '12',
        startDate: new Date().toISOString().split('T')[0],
        dueDayOfMonth: '10',
        notes: '',
      });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar mensalidade');
    }
  };

  const handleTogglePaid = async (installmentId: string, paid: boolean) => {
    try {
      await mutations.markInstallmentPaid.mutateAsync({ installmentId, paid });
      await runManualTuitionSync();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar pagamento');
    }
  };

  const isLoading = enrollmentsLoading || installmentsLoading;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Mensalidades dos alunos</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Cadastre e controle mensalidades manualmente, sem Stripe. Novas cobranças são geradas
            automaticamente conforme o ciclo do pacote. Acompanhe pagamentos, atrasos e vencimentos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Nova mensalidade
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700 font-medium">Em atraso</p>
          <p className="text-2xl font-bold text-red-800">{stats.overdue}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700 font-medium">Vence em até {TUITION_DUE_REMINDER_DAYS} dias</p>
          <p className="text-2xl font-bold text-amber-800">{stats.dueSoon}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs text-neutral-600 font-medium">Pendentes</p>
          <p className="text-2xl font-bold text-neutral-800">{stats.pending}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-700 font-medium">Pagas</p>
          <p className="text-2xl font-bold text-green-800">{stats.paid}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'Todos'],
              ['overdue', 'Em atraso'],
              ['pending', 'Pendentes'],
              ['paid', 'Quitados'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterStatus(value)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                filterStatus === value
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <input
            type="search"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Buscar aluno por nome..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm pr-8"
          />
          {searchName && (
            <button
              type="button"
              onClick={() => setSearchName('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto" />
        </div>
      ) : filteredEnrollments.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                <th className="py-3 px-4 font-medium">Aluno</th>
                <th className="py-3 px-4 font-medium">Plano</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Próxima cobrança</th>
                <th className="py-3 px-4 font-medium">Mensalidade</th>
                <th className="py-3 px-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollments.map((enrollment) => (
                <EnrollmentCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  installments={installmentsByEnrollment.get(enrollment.id) ?? []}
                  onCancel={(id) => mutations.cancelEnrollment.mutate(id)}
                  onDelete={(id) => mutations.deleteEnrollment.mutate(id)}
                  onTogglePaid={handleTogglePaid}
                  actionLoading={actionLoading}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-neutral-500 py-6 text-sm text-center">
          {enrollments.length === 0
            ? 'Nenhuma mensalidade cadastrada. Clique em "+ Nova mensalidade" para começar.'
            : searchName.trim()
              ? `Nenhum aluno encontrado para "${searchName.trim()}".`
              : 'Nenhum plano corresponde ao filtro selecionado.'}
        </p>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Nova mensalidade</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Aluno</label>
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecione um aluno</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${c.firstName} ${c.lastName}`.trim() || c.email || c.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Ciclo de cobrança (meses)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={form.billingCycleMonths}
                    onChange={(e) => setForm({ ...form, billingCycleMonths: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    placeholder="Ex.: 3"
                    required
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    De quanto em quanto tempo o aluno paga (1 = todo mês, 3 = a cada 3 meses).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Frequência (x/semana)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={form.frequencyPerWeek}
                    onChange={(e) => setForm({ ...form, frequencyPerWeek: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Valor da mensalidade (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.installmentAmountBrl}
                  onChange={(e) => setForm({ ...form, installmentAmountBrl: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="400,00"
                  required
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Valor de cada cobrança dentro do plano (ex.: R$ 400 por mensalidade).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Duração do plano (meses)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={form.planDurationMonths}
                    onChange={(e) => setForm({ ...form, planDurationMonths: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    placeholder="12"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Início do plano
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              {formPlanEndPreview && form.startDate && (
                <p className="text-sm text-neutral-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  Vigência:{' '}
                  <strong>
                    {formatDueDate(new Date(form.startDate + 'T12:00:00'))} até{' '}
                    {formatDueDate(new Date(formPlanEndPreview + 'T12:00:00'))}
                  </strong>
                  {form.planDurationMonths && (
                    <span className="text-neutral-600">
                      {' '}
                      (plano de {form.planDurationMonths}{' '}
                      {parseInt(form.planDurationMonths, 10) === 1 ? 'mês' : 'meses'})
                    </span>
                  )}
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Vencimento (dia do mês)
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dueDayOfMonth}
                  onChange={(e) => setForm({ ...form, dueDayOfMonth: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm max-w-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Ex.: Desconto de 10% acordado com os pais"
                />
              </div>

              {form.customerId && form.billingCycleMonths && form.frequencyPerWeek && (
                <p className="text-sm text-neutral-600 bg-neutral-50 rounded-lg p-3">
                  <strong>
                    {buildPlanName(
                      parseInt(form.billingCycleMonths, 10) || 0,
                      parseInt(form.frequencyPerWeek, 10) || 0,
                      parseInt(form.planDurationMonths, 10) || undefined,
                    )}
                  </strong>
                  {form.installmentAmountBrl &&
                    ` · ${formatBrlFromCents(Math.round(parseFloat(form.installmentAmountBrl.replace(',', '.')) * 100) || 0)} por mensalidade`}
                </p>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Salvando...' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError(null);
                  }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

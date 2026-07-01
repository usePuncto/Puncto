import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  computeFirstDueDate,
  computeNextDueDate,
  computePlanEndDateStr,
  dueDatesMatch,
  isDueDateWithinPlan,
  resolveFirstDueDate,
} from '@/lib/manualTuition/billingDates';
import type {
  ManualTuitionEnrollment,
  ManualTuitionInstallment,
  ManualTuitionInstallmentStatus,
} from '@/types/manualTuition';

export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const ts = value as { toDate?: () => Date; seconds?: number };
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
  return new Date(String(value));
}

function mapEnrollment(docSnap: QueryDocumentSnapshot): ManualTuitionEnrollment {
  const data = docSnap.data() as Record<string, unknown>;
  const billingCycleMonths = Number(data.billingCycleMonths ?? data.durationMonths ?? 1);
  const installmentAmountCents = Number(
    data.installmentAmountCents ?? data.packageAmountCents ?? data.monthlyAmountCents ?? 0,
  );
  const startDate = String(data.startDate ?? '');
  const planDurationMonths = Number(data.planDurationMonths ?? 0);
  const planEndDate =
    typeof data.planEndDate === 'string' && data.planEndDate
      ? data.planEndDate
      : planDurationMonths > 0 && startDate
        ? computePlanEndDateStr(startDate, planDurationMonths)
        : '';

  return {
    id: docSnap.id,
    businessId: String(data.businessId ?? ''),
    customerId: String(data.customerId ?? ''),
    customerName: String(data.customerName ?? ''),
    planName: String(data.planName ?? ''),
    billingCycleMonths,
    frequencyPerWeek: Number(data.frequencyPerWeek ?? 0),
    installmentAmountCents,
    firstInstallmentAmountCents:
      typeof data.firstInstallmentAmountCents === 'number'
        ? data.firstInstallmentAmountCents
        : undefined,
    firstInstallmentDueDate:
      typeof data.firstInstallmentDueDate === 'string' && data.firstInstallmentDueDate
        ? data.firstInstallmentDueDate
        : undefined,
    planDurationMonths,
    startDate,
    planEndDate,
    dueDayOfMonth: Number(data.dueDayOfMonth ?? 10),
    status: (data.status as ManualTuitionEnrollment['status']) ?? 'active',
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mapInstallment(docSnap: QueryDocumentSnapshot): ManualTuitionInstallment {
  const data = docSnap.data() as Record<string, unknown>;
  return {
    id: docSnap.id,
    businessId: String(data.businessId ?? ''),
    enrollmentId: String(data.enrollmentId ?? ''),
    customerId: String(data.customerId ?? ''),
    customerName: String(data.customerName ?? ''),
    planName: String(data.planName ?? ''),
    installmentNumber: Number(data.installmentNumber ?? 0),
    dueDate: toDate(data.dueDate),
    amountCents: Number(data.amountCents ?? 0),
    status: (data.status as ManualTuitionInstallmentStatus) ?? 'pending',
    paidAt: data.paidAt ? toDate(data.paidAt) : null,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** @deprecated Use computeFirstDueDate / sync server-side for próximas cobranças. */
export function computeInstallmentDueDates(
  startDateStr: string,
  dueDayOfMonth: number,
  _billingCycleMonths: number,
  periodsAhead = 1,
): Date[] {
  if (periodsAhead <= 0) return [];
  return [computeFirstDueDate(startDateStr, dueDayOfMonth)];
}

export function buildPlanName(
  billingCycleMonths: number,
  frequencyPerWeek: number,
  planDurationMonths?: number,
): string {
  const durationPart =
    planDurationMonths && planDurationMonths > 0
      ? `Plano ${planDurationMonths} meses`
      : 'Plano';
  const cycleLabel =
    billingCycleMonths === 1
      ? 'cobrança mensal'
      : `cobrança a cada ${billingCycleMonths} meses`;
  return `${durationPart} — ${frequencyPerWeek}x/semana — ${cycleLabel}`;
}

export function formatPlanPeriod(enrollment: ManualTuitionEnrollment): string {
  if (!enrollment.startDate) return '—';
  const start = formatDueDate(new Date(enrollment.startDate + 'T12:00:00'));
  if (!enrollment.planEndDate) return `desde ${start}`;
  const end = formatDueDate(new Date(enrollment.planEndDate + 'T12:00:00'));
  return `${start} até ${end}`;
}

export function formatBillingIntervalLabel(billingCycleMonths: number): string {
  if (billingCycleMonths === 1) return 'a cada mês';
  if (billingCycleMonths === 2) return 'a cada 2 meses';
  return `a cada ${billingCycleMonths} meses`;
}

export function getEffectiveInstallmentStatus(
  installment: ManualTuitionInstallment,
): ManualTuitionInstallmentStatus {
  if (installment.status === 'paid') return 'paid';
  const due = installment.dueDate instanceof Date ? installment.dueDate : toDate(installment.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  if (dueDay < today) return 'overdue';
  return installment.status === 'overdue' ? 'overdue' : 'pending';
}

/** Próxima cobrança em aberto (pendente ou em atraso), ou previsão após quitar todas. */
export function getNextChargeDisplay(
  enrollment: ManualTuitionEnrollment,
  installments: ManualTuitionInstallment[],
): { label: string; status: ManualTuitionInstallmentStatus | 'scheduled' | null } {
  const sorted = [...installments].sort(
    (a, b) => toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime(),
  );

  const nextOpen = sorted.find((i) => getEffectiveInstallmentStatus(i) !== 'paid');
  if (nextOpen) {
    return {
      label: formatDueDate(nextOpen.dueDate),
      status: getEffectiveInstallmentStatus(nextOpen),
    };
  }

  if (sorted.length === 0) {
    const first = resolveFirstDueDate(
      enrollment.startDate,
      enrollment.dueDayOfMonth,
      enrollment.firstInstallmentDueDate,
    );
    return { label: formatDueDate(first), status: 'scheduled' };
  }

  const latest = sorted[sorted.length - 1];
  const estimated = computeNextDueDate(
    toDate(latest.dueDate),
    enrollment.billingCycleMonths,
    enrollment.dueDayOfMonth,
  );

  if (enrollment.planEndDate && !isDueDateWithinPlan(estimated, enrollment.planEndDate)) {
    return { label: 'Plano encerrado', status: null };
  }

  return { label: `${formatDueDate(estimated)} (prevista)`, status: 'scheduled' };
}

export function useManualTuitionEnrollments(businessId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['manualTuitionEnrollments', businessId],
    enabled: !!businessId && enabled,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'manualTuitionEnrollments');
      const snap = await getDocs(ref);
      return snap.docs
        .map(mapEnrollment)
        .filter((e) => e.status !== 'canceled')
        .sort((a, b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime());
    },
  });
}

export function useManualTuitionInstallments(businessId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['manualTuitionInstallments', businessId],
    enabled: !!businessId && enabled,
    queryFn: async () => {
      const ref = collection(db, 'businesses', businessId, 'manualTuitionInstallments');
      const snap = await getDocs(ref);
      return snap.docs.map(mapInstallment).sort((a, b) => {
        const aDue = a.dueDate instanceof Date ? a.dueDate : toDate(a.dueDate);
        const bDue = b.dueDate instanceof Date ? b.dueDate : toDate(b.dueDate);
        return aDue.getTime() - bDue.getTime();
      });
    },
  });
}

export function useManualTuitionMutations(businessId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['manualTuitionEnrollments', businessId] });
    queryClient.invalidateQueries({ queryKey: ['manualTuitionInstallments', businessId] });
  };

  const createEnrollment = useMutation({
    mutationFn: async (input: {
      customerId: string;
      customerName: string;
      billingCycleMonths: number;
      frequencyPerWeek: number;
      installmentAmountCents: number;
      planDurationMonths: number;
      startDate: string;
      dueDayOfMonth: number;
      planName?: string;
      notes?: string;
      firstInstallmentAmountCents?: number;
      firstInstallmentDueDate?: string;
    }) => {
      const now = Timestamp.now();
      const planEndDate = computePlanEndDateStr(input.startDate, input.planDurationMonths);
      const planName =
        input.planName?.trim() ||
        buildPlanName(input.billingCycleMonths, input.frequencyPerWeek, input.planDurationMonths);

      const firstDue = resolveFirstDueDate(
        input.startDate,
        input.dueDayOfMonth,
        input.firstInstallmentDueDate,
      );
      if (!isDueDateWithinPlan(firstDue, planEndDate)) {
        throw new Error('A primeira cobrança cai após o término do plano. Ajuste as datas ou a duração.');
      }

      const standardFirstDue = computeFirstDueDate(input.startDate, input.dueDayOfMonth);
      const isDivergentFirst =
        (input.firstInstallmentAmountCents != null &&
          input.firstInstallmentAmountCents !== input.installmentAmountCents) ||
        (input.firstInstallmentDueDate != null &&
          dueDatesMatch(firstDue, standardFirstDue) === false);

      const enrollRef = collection(db, 'businesses', businessId, 'manualTuitionEnrollments');
      const enrollDoc = await addDoc(enrollRef, {
        businessId,
        customerId: input.customerId,
        customerName: input.customerName,
        planName,
        billingCycleMonths: input.billingCycleMonths,
        frequencyPerWeek: input.frequencyPerWeek,
        installmentAmountCents: input.installmentAmountCents,
        firstInstallmentAmountCents: input.firstInstallmentAmountCents ?? null,
        firstInstallmentDueDate: input.firstInstallmentDueDate ?? null,
        packageAmountCents: input.installmentAmountCents,
        monthlyAmountCents: input.installmentAmountCents,
        planDurationMonths: input.planDurationMonths,
        planEndDate,
        startDate: input.startDate,
        dueDayOfMonth: input.dueDayOfMonth,
        status: 'active',
        notes: input.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      });

      const instRef = collection(db, 'businesses', businessId, 'manualTuitionInstallments');
      await addDoc(instRef, {
        businessId,
        enrollmentId: enrollDoc.id,
        customerId: input.customerId,
        customerName: input.customerName,
        planName,
        installmentNumber: 1,
        dueDate: Timestamp.fromDate(firstDue),
        amountCents: input.firstInstallmentAmountCents ?? input.installmentAmountCents,
        status: 'pending',
        paidAt: null,
        notes: isDivergentFirst ? 'Primeira mensalidade personalizada' : null,
        createdAt: now,
        updatedAt: now,
      });

      return enrollDoc.id;
    },
    onSuccess: invalidate,
  });

  const markInstallmentPaid = useMutation({
    mutationFn: async ({
      installmentId,
      paid,
    }: {
      installmentId: string;
      paid: boolean;
    }) => {
      const ref = doc(db, 'businesses', businessId, 'manualTuitionInstallments', installmentId);
      const now = Timestamp.now();
      await updateDoc(ref, {
        status: paid ? 'paid' : 'pending',
        paidAt: paid ? now : null,
        updatedAt: now,
      });
    },
    onSuccess: invalidate,
  });

  const cancelEnrollment = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const now = Timestamp.now();
      const enrollRef = doc(db, 'businesses', businessId, 'manualTuitionEnrollments', enrollmentId);
      await updateDoc(enrollRef, { status: 'canceled', updatedAt: now });

      const instRef = collection(db, 'businesses', businessId, 'manualTuitionInstallments');
      const snap = await getDocs(query(instRef, where('enrollmentId', '==', enrollmentId)));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status !== 'paid') {
          batch.delete(d.ref);
        }
      });
      await batch.commit();
    },
    onSuccess: invalidate,
  });

  const deleteEnrollment = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const enrollRef = doc(db, 'businesses', businessId, 'manualTuitionEnrollments', enrollmentId);
      await deleteDoc(enrollRef);

      const instRef = collection(db, 'businesses', businessId, 'manualTuitionInstallments');
      const snap = await getDocs(query(instRef, where('enrollmentId', '==', enrollmentId)));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },
    onSuccess: invalidate,
  });

  return {
    createEnrollment,
    markInstallmentPaid,
    cancelEnrollment,
    deleteEnrollment,
  };
}

export function formatBrlFromCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function formatDueDate(value: Date | unknown): string {
  const d = value instanceof Date ? value : toDate(value);
  return d.toLocaleDateString('pt-BR');
}

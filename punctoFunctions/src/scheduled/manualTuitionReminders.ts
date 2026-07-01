import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

const TUITION_DUE_REMINDER_DAYS = 5;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return startOfDay(x);
}

function clampDueDay(dueDayOfMonth: number): number {
  return Math.min(Math.max(dueDayOfMonth, 1), 28);
}

function computeFirstDueDate(startDateStr: string, dueDayOfMonth: number): Date {
  const start = new Date(startDateStr + 'T12:00:00');
  const day = clampDueDay(dueDayOfMonth);
  return new Date(start.getFullYear(), start.getMonth(), day);
}

function resolveFirstDueDate(
  startDate: string,
  dueDayOfMonth: number,
  firstInstallmentDueDate?: string | null,
): Date {
  if (firstInstallmentDueDate) {
    return startOfDay(new Date(firstInstallmentDueDate + 'T12:00:00'));
  }
  return computeFirstDueDate(startDate, dueDayOfMonth);
}

function computeNextDueDate(fromDueDate: Date, billingCycleMonths: number, dueDayOfMonth: number): Date {
  const day = clampDueDay(dueDayOfMonth);
  const cycle = Math.max(1, billingCycleMonths);
  const d = startOfDay(fromDueDate);
  return new Date(d.getFullYear(), d.getMonth() + cycle, day);
}

function dueDatesMatch(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function shouldCreateInstallmentWithDueDate(nextDueDate: Date, today: Date): boolean {
  const threshold = addDays(startOfDay(today), TUITION_DUE_REMINDER_DAYS);
  return startOfDay(nextDueDate).getTime() <= threshold.getTime();
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

async function getStaffRecipientUserIds(businessId: string): Promise<string[]> {
  const staffRef = db.collection('businesses').doc(businessId).collection('staff');
  const [adminSnap, businessDoc] = await Promise.all([
    staffRef.where('role', 'in', ['owner', 'manager']).get(),
    db.collection('businesses').doc(businessId).get(),
  ]);
  const adminUserIds = adminSnap.docs.map((d) => d.id);
  const createdBy = (businessDoc.data() as { createdBy?: string } | undefined)?.createdBy;
  return Array.from(new Set([...(createdBy ? [createdBy] : []), ...adminUserIds]));
}

function computePlanEndDateStr(startDateStr: string, planDurationMonths: number): string {
  const start = new Date(startDateStr + 'T12:00:00');
  const months = Math.max(1, planDurationMonths);
  const end = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isDueDateWithinPlan(dueDate: Date, planEndDateStr: string | null): boolean {
  if (!planEndDateStr) return true;
  const end = startOfDay(new Date(planEndDateStr + 'T12:00:00'));
  return startOfDay(dueDate).getTime() <= end.getTime();
}

async function ensureManualTuitionInstallments(businessId: string): Promise<number> {
  const enrollSnap = await db
    .collection('businesses')
    .doc(businessId)
    .collection('manualTuitionEnrollments')
    .where('status', '==', 'active')
    .get();

  let created = 0;
  const today = startOfDay(new Date());

  for (const enrollDoc of enrollSnap.docs) {
    const data = enrollDoc.data();
    const billingCycleMonths = Number(data.billingCycleMonths ?? data.durationMonths ?? 1);
    const installmentAmountCents = Number(
      data.installmentAmountCents ?? data.packageAmountCents ?? data.monthlyAmountCents ?? 0,
    );
    const firstInstallmentAmountCents =
      typeof data.firstInstallmentAmountCents === 'number'
        ? data.firstInstallmentAmountCents
        : undefined;
    const firstInstallmentDueDate =
      typeof data.firstInstallmentDueDate === 'string' && data.firstInstallmentDueDate
        ? data.firstInstallmentDueDate
        : undefined;
    const dueDayOfMonth = Number(data.dueDayOfMonth ?? 10);
    const startDate = String(data.startDate ?? '');
    const planDurationMonths = Number(data.planDurationMonths ?? 0);
    const planEndDate =
      typeof data.planEndDate === 'string' && data.planEndDate
        ? data.planEndDate
        : planDurationMonths > 0 && startDate
          ? computePlanEndDateStr(startDate, planDurationMonths)
          : null;

    const instSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('manualTuitionInstallments')
      .where('enrollmentId', '==', enrollDoc.id)
      .get();

    type Row = { dueDate: Date; installmentNumber: number };
    const installments: Row[] = instSnap.docs
      .map((d) => {
        const row = d.data();
        const due = row.dueDate?.toDate?.() as Date | undefined;
        if (!due) return null;
        return { dueDate: due, installmentNumber: Number(row.installmentNumber ?? 0) };
      })
      .filter((r): r is Row => r !== null)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const now = Timestamp.now();
    const resolveAmount = (installmentNumber: number) => {
      if (
        installmentNumber === 1 &&
        firstInstallmentAmountCents != null &&
        firstInstallmentAmountCents > 0
      ) {
        return firstInstallmentAmountCents;
      }
      return installmentAmountCents;
    };
    const resolveNotes = (installmentNumber: number, dueDate: Date) => {
      if (installmentNumber !== 1) return null;
      const standardDue = computeFirstDueDate(startDate, dueDayOfMonth);
      const amountDivergent =
        firstInstallmentAmountCents != null &&
        firstInstallmentAmountCents !== installmentAmountCents;
      const dateDivergent = !dueDatesMatch(dueDate, standardDue);
      return amountDivergent || dateDivergent ? 'Primeira mensalidade personalizada' : null;
    };
    const baseFields = {
      businessId,
      enrollmentId: enrollDoc.id,
      customerId: String(data.customerId ?? ''),
      customerName: String(data.customerName ?? ''),
      planName: String(data.planName ?? 'Mensalidade'),
      status: 'pending',
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (installments.length === 0) {
      const firstDue = resolveFirstDueDate(startDate, dueDayOfMonth, firstInstallmentDueDate);
      if (!isDueDateWithinPlan(firstDue, planEndDate)) continue;
      await db.collection('businesses').doc(businessId).collection('manualTuitionInstallments').add({
        ...baseFields,
        installmentNumber: 1,
        dueDate: Timestamp.fromDate(firstDue),
        amountCents: resolveAmount(1),
        notes: resolveNotes(1, firstDue),
      });
      created++;
      continue;
    }

    const latest = installments[installments.length - 1];
    const nextDue = computeNextDueDate(latest.dueDate, billingCycleMonths, dueDayOfMonth);

    if (!isDueDateWithinPlan(nextDue, planEndDate)) continue;
    if (installments.some((i) => dueDatesMatch(i.dueDate, nextDue))) continue;
    if (!shouldCreateInstallmentWithDueDate(nextDue, today)) continue;

    const nextNumber =
      Math.max(...installments.map((i) => i.installmentNumber), installments.length) + 1;
    await db.collection('businesses').doc(businessId).collection('manualTuitionInstallments').add({
      ...baseFields,
      installmentNumber: nextNumber,
      dueDate: Timestamp.fromDate(nextDue),
      amountCents: resolveAmount(nextNumber),
      notes: resolveNotes(nextNumber, nextDue),
    });
    created++;
  }

  return created;
}

async function syncManualTuitionForBusiness(businessId: string): Promise<{
  updatedOverdue: number;
  notificationsCreated: number;
  installmentsCreated: number;
}> {
  const installmentsCreated = await ensureManualTuitionInstallments(businessId);
  const today = startOfDay(new Date());

  const instSnap = await db
    .collection('businesses')
    .doc(businessId)
    .collection('manualTuitionInstallments')
    .where('status', 'in', ['pending', 'overdue'])
    .get();

  const recipientUserIds = await getStaffRecipientUserIds(businessId);
  let updatedOverdue = 0;
  let notificationsCreated = 0;

  for (const instDoc of instSnap.docs) {
    const data = instDoc.data();
    const dueDate = data.dueDate?.toDate?.() as Date | undefined;
    if (!dueDate) continue;

    const dueDay = startOfDay(dueDate);
    const daysUntilDue = daysBetween(today, dueDay);

    if (data.status === 'pending' && dueDay < today) {
      await instDoc.ref.update({ status: 'overdue', updatedAt: Timestamp.now() });
      updatedOverdue++;
    }

    let eventType: string | null = null;
    if (daysUntilDue < 0) eventType = 'tuition.overdue';
    else if (daysUntilDue > 0 && daysUntilDue <= TUITION_DUE_REMINDER_DAYS) eventType = 'tuition.due_soon';

    if (!eventType || recipientUserIds.length === 0) continue;

    const customerName = String(data.customerName ?? 'Aluno');
    const planName = String(data.planName ?? 'Mensalidade');
    const amountCents = Number(data.amountCents ?? 0);

    for (const recipientUserId of recipientUserIds) {
      const notificationId = `${instDoc.id}_${eventType}_${recipientUserId}`;
      const notifRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('notifications')
        .doc(notificationId);

      const existing = await notifRef.get();
      if (existing.exists) continue;

      await notifRef.set({
        businessId,
        bookingId: instDoc.id,
        recipientUserId,
        eventType,
        isRead: false,
        readAt: null,
        createdAt: Timestamp.now(),
        serviceName: planName,
        professionalName: formatBrl(amountCents),
        customerName,
        scheduledDateTime: Timestamp.fromDate(dueDate),
        bookingStatus: eventType,
      });
      notificationsCreated++;
    }
  }

  return { updatedOverdue, notificationsCreated, installmentsCreated };
}

/**
 * Runs daily to generate due installments, mark overdue, and create staff notifications.
 */
export const syncManualTuitionReminders = onSchedule(
  {
    schedule: 'every day 08:00',
    timeZone: 'America/Sao_Paulo',
  },
  async () => {
    logger.info('[ManualTuition] Starting daily sync...');

    const businessesSnap = await db.collection('businesses').where('industry', '==', 'education').get();

    for (const businessDoc of businessesSnap.docs) {
      try {
        const result = await syncManualTuitionForBusiness(businessDoc.id);
        if (
          result.updatedOverdue > 0 ||
          result.notificationsCreated > 0 ||
          result.installmentsCreated > 0
        ) {
          logger.info(`[ManualTuition] ${businessDoc.id}:`, result);
        }
      } catch (err) {
        logger.error(`[ManualTuition] Failed for ${businessDoc.id}:`, err);
      }
    }

    logger.info('[ManualTuition] Daily sync complete.');
  },
);

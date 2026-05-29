import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  computeFirstDueDate,
  computeNextDueDate,
  dueDatesMatch,
  shouldCreateInstallmentWithDueDate,
  startOfDay,
} from '@/lib/manualTuition/billingDates';

type InstallmentRow = {
  id: string;
  dueDate: Date;
  status: string;
  installmentNumber: number;
};

function enrollmentFields(data: Record<string, unknown>) {
  return {
    billingCycleMonths: Number(data.billingCycleMonths ?? data.durationMonths ?? 1),
    packageAmountCents: Number(data.packageAmountCents ?? data.monthlyAmountCents ?? 0),
    dueDayOfMonth: Number(data.dueDayOfMonth ?? 10),
    startDate: String(data.startDate ?? ''),
    customerId: String(data.customerId ?? ''),
    customerName: String(data.customerName ?? ''),
    planName: String(data.planName ?? 'Mensalidade'),
    businessId: String(data.businessId ?? ''),
  };
}

async function createInstallment(
  businessId: string,
  enrollmentId: string,
  fields: ReturnType<typeof enrollmentFields>,
  dueDate: Date,
  installmentNumber: number,
): Promise<void> {
  const now = Timestamp.now();
  await db
    .collection('businesses')
    .doc(businessId)
    .collection('manualTuitionInstallments')
    .add({
      businessId,
      enrollmentId,
      customerId: fields.customerId,
      customerName: fields.customerName,
      planName: fields.planName,
      installmentNumber,
      dueDate: Timestamp.fromDate(dueDate),
      amountCents: fields.packageAmountCents,
      status: 'pending',
      paidAt: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });
}

/**
 * Garante a próxima cobrança de cada plano ativo — uma por vez, conforme o calendário avança.
 */
export async function ensureManualTuitionInstallments(businessId: string): Promise<{ created: number }> {
  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists || businessDoc.data()?.industry !== 'education') {
    return { created: 0 };
  }

  const enrollSnap = await db
    .collection('businesses')
    .doc(businessId)
    .collection('manualTuitionEnrollments')
    .where('status', '==', 'active')
    .get();

  let created = 0;
  const today = startOfDay(new Date());

  for (const enrollDoc of enrollSnap.docs) {
    const fields = enrollmentFields(enrollDoc.data());
    const instSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('manualTuitionInstallments')
      .where('enrollmentId', '==', enrollDoc.id)
      .get();

    const installments: InstallmentRow[] = instSnap.docs
      .map((d) => {
        const data = d.data();
        const due = data.dueDate?.toDate?.() as Date | undefined;
        if (!due) return null;
        return {
          id: d.id,
          dueDate: due,
          status: String(data.status ?? 'pending'),
          installmentNumber: Number(data.installmentNumber ?? 0),
        };
      })
      .filter((row): row is InstallmentRow => row !== null)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    if (installments.length === 0) {
      const firstDue = computeFirstDueDate(fields.startDate, fields.dueDayOfMonth);
      await createInstallment(businessId, enrollDoc.id, fields, firstDue, 1);
      created++;
      continue;
    }

    const latest = installments[installments.length - 1];
    const nextDue = computeNextDueDate(
      latest.dueDate,
      fields.billingCycleMonths,
      fields.dueDayOfMonth,
    );

    if (installments.some((i) => dueDatesMatch(i.dueDate, nextDue))) {
      continue;
    }

    if (!shouldCreateInstallmentWithDueDate(nextDue, today)) {
      continue;
    }

    const nextNumber =
      Math.max(...installments.map((i) => i.installmentNumber), installments.length) + 1;
    await createInstallment(businessId, enrollDoc.id, fields, nextDue, nextNumber);
    created++;
  }

  return { created };
}

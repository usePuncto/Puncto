import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { startOfDay as billingStartOfDay, TUITION_DUE_REMINDER_DAYS } from '@/lib/manualTuition/billingDates';
import { ensureManualTuitionInstallments } from '@/lib/server/manualTuitionInstallments';
import { getStaffNotificationRecipientUserIds } from '@/lib/server/staffNotificationRecipients';
import type { BookingNotificationEventType } from '@/types/notifications';

type TuitionNotificationEvent = 'tuition.due_soon' | 'tuition.overdue';

const TUITION_EVENT_TYPES: TuitionNotificationEvent[] = ['tuition.due_soon', 'tuition.overdue'];

function startOfDay(d: Date): Date {
  return billingStartOfDay(d);
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export async function syncManualTuitionDueNotifications(businessId: string): Promise<{
  updatedOverdue: number;
  notificationsCreated: number;
  installmentsCreated: number;
}> {
  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists || businessDoc.data()?.industry !== 'education') {
    return { updatedOverdue: 0, notificationsCreated: 0, installmentsCreated: 0 };
  }

  const { created: installmentsCreated } = await ensureManualTuitionInstallments(businessId);

  const now = new Date();
  const today = startOfDay(now);

  const instSnap = await db
    .collection('businesses')
    .doc(businessId)
    .collection('manualTuitionInstallments')
    .where('status', 'in', ['pending', 'overdue'])
    .get();

  const recipientUserIds = await getStaffNotificationRecipientUserIds(businessId);
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

    let eventType: TuitionNotificationEvent | null = null;
    if (daysUntilDue < 0) {
      eventType = 'tuition.overdue';
    } else if (daysUntilDue > 0 && daysUntilDue <= TUITION_DUE_REMINDER_DAYS) {
      eventType = 'tuition.due_soon';
    }

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
        eventType: eventType as BookingNotificationEventType,
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

export { TUITION_EVENT_TYPES };

import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebaseAdmin';
import { getStaffNotificationRecipientUserIds } from '@/lib/server/staffNotificationRecipients';

export async function notifyLessonRescheduleRequestCreated(params: {
  businessId: string;
  requestId: string;
  turmaName: string;
  professionalId?: string;
  customerFirstName?: string;
  customerLastName?: string;
  requestedDate: string;
  requestedStartTime: string;
}): Promise<void> {
  const recipientUserIds = await getStaffNotificationRecipientUserIds(
    params.businessId,
    params.professionalId,
  );
  if (recipientUserIds.length === 0) return;

  const customerName =
    `${params.customerFirstName || ''} ${params.customerLastName || ''}`.trim() || 'Aluno';

  let professionalName = '';
  if (params.professionalId) {
    const ps = await db
      .collection('businesses')
      .doc(params.businessId)
      .collection('professionals')
      .doc(params.professionalId)
      .get();
    professionalName = (ps.data()?.name as string) || '';
  }

  const scheduledDateTime = Timestamp.fromDate(
    new Date(`${params.requestedDate}T${params.requestedStartTime}:00`),
  );

  const notifBase = {
    businessId: params.businessId,
    bookingId: params.requestId,
    eventType: 'lesson_reschedule.pending' as const,
    isRead: false,
    readAt: null,
    createdAt: Timestamp.now(),
    serviceName: params.turmaName,
    professionalName,
    customerName,
    scheduledDateTime,
    bookingStatus: 'pending',
  };

  await Promise.all(
    recipientUserIds.map((recipientUserId) => {
      const notificationId = `${params.requestId}_lesson_reschedule.pending_${recipientUserId}`;
      return db
        .collection('businesses')
        .doc(params.businessId)
        .collection('notifications')
        .doc(notificationId)
        .set(
          {
            id: notificationId,
            ...notifBase,
            recipientUserId,
          },
          { merge: false },
        );
    }),
  );
}

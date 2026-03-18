import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

type NotificationEventType =
  | 'booking.confirmed'
  | 'booking.completed';

async function getRecipientUserIds(businessId: string, professionalId?: string) {
  const staffRef = db.collection('businesses').doc(businessId).collection('staff');

  // Admin recipients: owners + managers
  const adminSnap = await staffRef.where('role', 'in', ['owner', 'manager']).get();
  const adminUserIds = adminSnap.docs.map((d) => d.id);

  // Professional recipients: any staff user linked to this professionalId
  // (includes owner-while-professional cases too)
  let professionalUserIds: string[] = [];
  if (professionalId) {
    const proSnap = await staffRef.where('professionalId', '==', professionalId).get();
    professionalUserIds = proSnap.docs.map((d) => d.id);
  }

  // Fallback: include business createdBy if it exists (best-effort)
  const businessDoc = await db.collection('businesses').doc(businessId).get();
  const businessData = businessDoc.data() as { createdBy?: string } | undefined;
  const createdByUserId = businessData?.createdBy;

  return Array.from(new Set([...(createdByUserId ? [createdByUserId] : []), ...adminUserIds, ...professionalUserIds]));
}

function buildCustomerName(customerData: any) {
  const first = customerData?.firstName || '';
  const last = customerData?.lastName || '';
  return `${first} ${last}`.trim();
}

async function createBookingNotifications({
  businessId,
  bookingId,
  eventType,
  booking,
}: {
  businessId: string;
  bookingId: string;
  eventType: NotificationEventType;
  booking: any;
}) {
  const recipientUserIds = await getRecipientUserIds(businessId, booking?.professionalId);
  if (recipientUserIds.length === 0) {
    logger.warn(`[onBookingStatusChange] No recipients found for ${eventType} booking ${bookingId}`);
    return;
  }

  const customerName = buildCustomerName(booking?.customerData);

  await Promise.all(
    recipientUserIds.map(async (recipientUserId) => {
      const notificationId = `${bookingId}_${eventType}_${recipientUserId}`;
      const notifRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('notifications')
        .doc(notificationId);

      await notifRef.set(
        {
          id: notificationId,
          businessId,
          bookingId,
          eventType,
          recipientUserId,

          isRead: false,
          readAt: null,
          createdAt: Timestamp.now(),

          // minimal booking snapshot for the UI
          serviceName: booking?.serviceName || '',
          professionalName: booking?.professionalName || '',
          customerName,
          scheduledDateTime: booking?.scheduledDateTime,
          bookingStatus: booking?.status,
        },
        { merge: false }
      );
    })
  );
}

/**
 * Firestore trigger that creates notifications when a booking transitions
 * to `confirmed` and `completed`.
 */
export const onBookingStatusChange = onDocumentUpdated(
  {
    document: 'businesses/{businessId}/bookings/{bookingId}',
  },
  async (event) => {
    const bookingId = event.params.bookingId;
    const businessId = event.params.businessId;

    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;
    if (before.status === after.status) return;

    const eventType: NotificationEventType | null =
      after.status === 'confirmed'
        ? 'booking.confirmed'
        : after.status === 'completed'
        ? 'booking.completed'
        : null;

    if (!eventType) return;

    try {
      logger.info(
        `[onBookingStatusChange] Booking ${bookingId} -> ${eventType} for business ${businessId}`
      );

      await createBookingNotifications({
        businessId,
        bookingId,
        eventType,
        booking: after,
      });
    } catch (error) {
      logger.error(`[onBookingStatusChange] Error:`, error);
    }
  }
);


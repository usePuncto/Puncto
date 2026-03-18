import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { sendZeptoEmail } from '../lib/zeptomail';
import { bookingConfirmationEmail, bookingCreatedProfessionalEmail } from '../templates/email';
import { sendWhatsApp } from '../lib/whatsapp';

const db = getFirestore();

type NotificationEventType = 'booking.created' | 'booking.confirmed' | 'booking.completed';

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
    logger.warn(`[onBookingCreate] No recipients found for ${eventType} booking ${bookingId}`);
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
 * Firestore trigger that sends initial booking confirmation when a booking is created
 */
export const onBookingCreate = onDocumentCreated(
  {
    document: 'businesses/{businessId}/bookings/{bookingId}',
  },
  async (event) => {
    const bookingId = event.params.bookingId;
    const businessId = event.params.businessId;
    const booking = event.data?.data();

    if (!booking) {
      logger.error('[onBookingCreate] No booking data found');
      return;
    }

    logger.info(`[onBookingCreate] Processing booking ${bookingId} for business ${businessId}`);

    try {
      // Fetch business data
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      if (!businessDoc.exists) {
        logger.error(`[onBookingCreate] Business ${businessId} not found`);
        return;
      }

      const business = businessDoc.data();

      // Check if business wants to send confirmations
      const channels = business?.settings?.confirmationChannels || ['email'];
      
      const customerName = `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim();
      const scheduledDate = booking.scheduledDateTime.toDate();

      // Prepare confirmation data
      const confirmationData = {
        customerName,
        serviceName: booking.serviceName,
        professionalName: booking.professionalName,
        date: scheduledDate.toLocaleDateString('pt-BR'),
        time: scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        businessName: business?.displayName || '',
        businessPhone: business?.phone || '',
        businessAddress: business?.address
          ? `${business.address.street}, ${business.address.number} - ${business.address.city}`
          : '',
      };

      // Send via configured channels
      if (channels.includes('whatsapp') && booking.customerData?.phone) {
        try {
          const wResult = await sendWhatsApp({
            businessId,
            to: booking.customerData.phone,
            template: 'booking_confirmation',
            templateParams: [
              customerName || 'Cliente',
              confirmationData.serviceName,
              confirmationData.professionalName || '-',
              confirmationData.date,
              confirmationData.time,
              confirmationData.businessName || 'Estabelecimento',
            ],
          });
          if (wResult.success) {
            logger.info(`[onBookingCreate] WhatsApp sent to ${booking.customerData.phone}`);
          } else {
            logger.warn(`[onBookingCreate] WhatsApp failed for ${booking.customerData.phone}: ${wResult.error}`);
          }
        } catch (wErr: unknown) {
          logger.warn(`[onBookingCreate] WhatsApp error:`, wErr);
        }
      }

      if (channels.includes('email') && booking.customerData?.email) {
        const template = bookingConfirmationEmail(confirmationData);
        const result = await sendZeptoEmail({
          to: booking.customerData.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
        if (result.success) {
          logger.info(`[onBookingCreate] Email sent to ${booking.customerData.email}`);
        } else {
          logger.warn(`[onBookingCreate] Email failed for ${booking.customerData.email}: ${result.error}`);
        }
      }

      // Mark calendar event as ready to send
      await event.data?.ref.update({
        calendarEventSent: false, // Client can download .ics file
        updatedAt: Timestamp.now(),
      });

      logger.info(`[onBookingCreate] Booking ${bookingId} processed successfully`);

      // Create in-app notifications for admin + professional
      await createBookingNotifications({
        businessId,
        bookingId,
        eventType: 'booking.created',
        booking,
      });

      // Send email to the assigned professional(s) using the staff email
      await sendProfessionalBookingCreatedEmails({
        business,
        booking,
        businessId,
      });
    } catch (error: any) {
      logger.error(`[onBookingCreate] Error processing booking ${bookingId}:`, error);
    }
  }
);

async function getProfessionalStaffEmails(businessId: string, professionalId?: string) {
  if (!professionalId) return [];

  const staffRef = db.collection('businesses').doc(businessId).collection('staff');
  const proSnap = await staffRef.where('professionalId', '==', professionalId).get();

  const emails = proSnap.docs
    .map((d) => d.data()?.email as string | undefined)
    .filter((e) => !!e);

  return Array.from(new Set(emails));
}

async function sendProfessionalBookingCreatedEmails({
  business,
  booking,
  businessId,
}: {
  business: any;
  booking: any;
  businessId: string;
}) {
  const emails = await getProfessionalStaffEmails(businessId, booking?.professionalId);
  if (emails.length === 0) {
    logger.warn(`[onBookingCreate] No professional emails found for business ${businessId}`);
    return;
  }

  const scheduledDate = booking.scheduledDateTime.toDate();
  const date = scheduledDate.toLocaleDateString('pt-BR');
  const time = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const template = bookingCreatedProfessionalEmail({
    professionalName: booking.professionalName || 'Profissional',
    customerName: buildCustomerName(booking?.customerData),
    serviceName: booking.serviceName || '',
    date,
    time,
    businessName: business?.displayName || '',
    businessPhone: business?.phone || '',
    businessAddress: business?.address
      ? `${business.address.street}, ${business.address.number} - ${business.address.city}`
      : '',
  });

  const result = await sendZeptoEmail({
    to: emails,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (!result.success) {
    logger.warn(`[onBookingCreate] Failed to send professional emails: ${result.error}`);
  } else {
    logger.info(
      `[onBookingCreate] Professional booking.created email sent to ${emails.length} recipient(s)`
    );
  }
}

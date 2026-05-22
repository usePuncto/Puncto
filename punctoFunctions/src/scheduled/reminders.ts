import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { sendZeptoEmail } from '../lib/zeptomail';
import { sendWhatsApp } from '../lib/whatsapp';
import { bookingReminderEmail } from '../templates/email';
import { buildBookingReminderText } from '../lib/messageText';

const db = getFirestore();

function whatsappReminderEnabled(business: {
  features?: { whatsappReminders?: boolean };
  settings?: { confirmationChannels?: string[] };
}): boolean {
  if (business.features?.whatsappReminders === false) return false;
  const channels = business.settings?.confirmationChannels || ['email'];
  return channels.includes('whatsapp');
}

/**
 * Hourly booking reminders (email: 48h, 24h, 3h; WhatsApp: 24h only).
 */
export const sendBookingReminders = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'America/Sao_Paulo',
  },
  async () => {
    logger.info('[Reminders] Starting reminder check...');

    const now = new Date();
    const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const businessesSnapshot = await db.collection('businesses').get();

    for (const businessDoc of businessesSnapshot.docs) {
      const businessId = businessDoc.id;
      const business = businessDoc.data();
      const canSendWhatsApp = whatsappReminderEnabled(business);

      const bookingsQuery = db
        .collection('businesses')
        .doc(businessId)
        .collection('bookings')
        .where('status', 'in', ['pending', 'confirmed'])
        .where('scheduledDateTime', '>=', Timestamp.fromDate(now))
        .where('scheduledDateTime', '<=', Timestamp.fromDate(fortyEightHoursLater));

      const bookingsSnapshot = await bookingsQuery.get();

      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();
        const scheduledTime = booking.scheduledDateTime.toDate();
        const hoursUntil = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        let reminderType: '48h' | '24h' | '3h' | null = null;

        if (hoursUntil <= 3 && hoursUntil > 2.5 && !booking.reminders?.['3h']) {
          reminderType = '3h';
        } else if (hoursUntil <= 24 && hoursUntil > 23.5 && !booking.reminders?.['24h']) {
          reminderType = '24h';
        } else if (hoursUntil <= 48 && hoursUntil > 47.5 && !booking.reminders?.['48h']) {
          reminderType = '48h';
        }

        if (!reminderType) continue;

        logger.info(`[Reminders] Sending ${reminderType} reminder for booking ${bookingDoc.id}`);

        const hoursUntilLabel =
          reminderType === '3h' ? 3 : reminderType === '24h' ? 24 : 48;
        const customerName =
          `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim() ||
          'Cliente';
        const date = scheduledTime.toLocaleDateString('pt-BR');
        const time = scheduledTime.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const serviceName = booking.serviceName || 'Serviço';

        if (booking.customerData?.email) {
          const template = bookingReminderEmail({
            customerName,
            serviceName,
            date,
            time,
            hoursUntil: hoursUntilLabel,
          });
          const result = await sendZeptoEmail({
            to: booking.customerData.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });
          if (!result.success) {
            logger.warn(`[Reminders] Email failed for ${bookingDoc.id}: ${result.error}`);
          }
        }

        if (
          reminderType === '24h' &&
          canSendWhatsApp &&
          booking.customerData?.phone
        ) {
          const text = buildBookingReminderText({
            customerName,
            serviceName,
            date,
            time,
            hoursUntil: 24,
          });
          const wResult = await sendWhatsApp({
            businessId,
            to: booking.customerData.phone,
            text,
          });
          if (wResult.success) {
            logger.info(`[Reminders] WhatsApp 24h sent for booking ${bookingDoc.id}`);
          } else {
            logger.warn(
              `[Reminders] WhatsApp 24h failed for ${bookingDoc.id}: ${wResult.error}`
            );
          }
        }

        await bookingDoc.ref.update({
          [`reminders.${reminderType}`]: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    }

    logger.info('[Reminders] Reminder check completed');
  }
);

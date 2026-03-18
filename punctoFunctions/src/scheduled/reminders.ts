import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { sendZeptoEmail } from '../lib/zeptomail';
import { bookingReminderEmail } from '../templates/email';

const db = getFirestore();

/**
 * Scheduled function that runs every hour to send booking reminders
 * Checks for bookings that need reminders at T-48h, T-24h, T-3h
 */
export const sendBookingReminders = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'America/Sao_Paulo',
  },
  async (event) => {
    logger.info('[Reminders] Starting reminder check...');

    const now = new Date();
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Get all businesses
    const businessesSnapshot = await db.collection('businesses').get();

    for (const businessDoc of businessesSnapshot.docs) {
      const businessId = businessDoc.id;
      const business = businessDoc.data();

      // Get bookings in the reminder windows
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

        // Determine which reminder to send
        let reminderType: '48h' | '24h' | '3h' | null = null;

        if (hoursUntil <= 3 && hoursUntil > 2.5 && !booking.reminders?.['3h']) {
          reminderType = '3h';
        } else if (hoursUntil <= 24 && hoursUntil > 23.5 && !booking.reminders?.['24h']) {
          reminderType = '24h';
        } else if (hoursUntil <= 48 && hoursUntil > 47.5 && !booking.reminders?.['48h']) {
          reminderType = '48h';
        }

        if (reminderType) {
          logger.info(`[Reminders] Sending ${reminderType} reminder for booking ${bookingDoc.id}`);

          const hoursUntil =
            reminderType === '3h' ? 3 : reminderType === '24h' ? 24 : 48;
          const customerName =
            `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim() ||
            'Cliente';
          const scheduledDate = scheduledTime;
          const template = bookingReminderEmail({
            customerName,
            serviceName: booking.serviceName || 'Serviço',
            date: scheduledDate.toLocaleDateString('pt-BR'),
            time: scheduledDate.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            hoursUntil,
          });

          if (booking.customerData?.email) {
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

          // Mark reminder as sent
          await bookingDoc.ref.update({
            [`reminders.${reminderType}`]: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
      }
    }

    logger.info('[Reminders] Reminder check completed');
  }
);

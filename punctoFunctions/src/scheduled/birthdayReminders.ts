import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { sendZeptoEmail } from '../lib/zeptomail';
// Customer type definition (inline for Firebase Functions)
interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  customFields?: {
    birthday?: string;
  };
}

// Placeholder functions
function getUpcomingBirthdays(customers: Customer[], days: number = 0): Customer[] {
  const today = new Date();
  return customers.filter((customer) => {
    if (!customer.customFields?.birthday) return false;
    const birthday = new Date(customer.customFields.birthday);
    return (
      birthday.getMonth() === today.getMonth() &&
      birthday.getDate() === today.getDate()
    );
  });
}

async function sendWhatsAppMessage(phone: string, message: string) {
  logger.info(`[WhatsApp] Would send to ${phone}: ${message}`);
}

async function sendEmail(recipientEmail: string, subject: string, body: string) {
  const result = await sendZeptoEmail({
    to: recipientEmail,
    subject,
    html: body,
    text: body.replace(/<br\s*\/?>/gi, '\n'),
  });
  if (!result.success) {
    throw new Error(result.error || 'Failed to send email');
  }
}

/**
 * Scheduled function that runs daily to check for customer birthdays
 * and send birthday campaigns
 */
export const sendBirthdayReminders = onSchedule(
  {
    schedule: '0 8 * * *', // Daily at 8 AM
    timeZone: 'America/Sao_Paulo',
  },
  async (event) => {
    logger.info('[sendBirthdayReminders] Starting birthday check');

    try {
      const db = getFirestore();
      const businessesSnapshot = await db.collection('businesses').get();

      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const business = businessDoc.data();

        // Check if birthday campaigns are enabled
        if (!business.settings?.birthdayCampaignsEnabled) {
          continue;
        }

        // Get all customers
        const customersSnapshot = await db
          .collection('businesses')
          .doc(businessId)
          .collection('customers')
          .get();

        const customers = customersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Customer[];

        // Get customers with birthdays today
        const birthdayCustomers = getUpcomingBirthdays(customers, 0);

        if (birthdayCustomers.length === 0) {
          continue;
        }

        logger.info(`[sendBirthdayReminders] Found ${birthdayCustomers.length} birthdays for business ${businessId}`);

        // Send birthday messages
        for (const customer of birthdayCustomers) {
          const message = `🎉 Feliz Aniversário, ${customer.firstName}!\n\n` +
            `A ${business.displayName} deseja um dia especial para você!\n\n` +
            `Aproveite nosso desconto especial de aniversário!`;

          if (customer.phone && business.settings?.whatsapp) {
            try {
              await sendWhatsAppMessage(customer.phone, message);
            } catch (error) {
              logger.error(`[sendBirthdayReminders] Failed to send WhatsApp to ${customer.id}:`, error);
            }
          }

          if (customer.email) {
            try {
              await sendEmail(
                customer.email,
                `Feliz Aniversário, ${customer.firstName}!`,
                message.replace(/\n/g, '<br>')
              );
            } catch (error) {
              logger.error(`[sendBirthdayReminders] Failed to send email to ${customer.id}:`, error);
            }
          }
        }
      }

      logger.info('[sendBirthdayReminders] Birthday reminders completed');
    } catch (error: any) {
      logger.error('[sendBirthdayReminders] Error:', error);
    }
  }
);

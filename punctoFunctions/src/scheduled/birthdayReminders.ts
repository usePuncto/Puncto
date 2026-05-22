import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { sendZeptoEmail } from '../lib/zeptomail';
import { sendWhatsApp } from '../lib/whatsapp';
import { isBirthdayToday, resolveCustomerBirthDate } from '../lib/birthdays';
import { buildBirthdayMessage } from '../lib/messageText';

interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  customFields?: { birthday?: string };
  lastBirthdayReminderYear?: number;
}

function isBirthdayCampaignEnabled(business: {
  settings?: { birthdayCampaignsEnabled?: boolean };
  features?: { birthdayReminders?: boolean };
}): boolean {
  if (business.settings?.birthdayCampaignsEnabled === false) return false;
  if (business.features?.birthdayReminders === false) return false;
  return true;
}

function whatsappChannelEnabled(business: { settings?: { confirmationChannels?: string[] } }): boolean {
  const channels = business.settings?.confirmationChannels || ['email'];
  return channels.includes('whatsapp');
}

/**
 * Daily check for customer birthdays (cliente/paciente/aluno) and sends WhatsApp + email.
 */
export const sendBirthdayReminders = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'America/Sao_Paulo',
  },
  async () => {
    logger.info('[sendBirthdayReminders] Starting birthday check');

    try {
      const db = getFirestore();
      const year = new Date().getFullYear();
      const businessesSnapshot = await db.collection('businesses').get();

      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const business = businessDoc.data();

        if (!isBirthdayCampaignEnabled(business)) {
          continue;
        }

        const customersSnapshot = await db
          .collection('businesses')
          .doc(businessId)
          .collection('customers')
          .get();

        const birthdayCustomers = customersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Customer)
          .filter((customer) => {
            const birthDate = resolveCustomerBirthDate(customer);
            return isBirthdayToday(birthDate) && customer.lastBirthdayReminderYear !== year;
          });

        if (birthdayCustomers.length === 0) {
          continue;
        }

        logger.info(
          `[sendBirthdayReminders] Found ${birthdayCustomers.length} birthdays for business ${businessId}`
        );

        const businessName = (business.displayName as string) || 'nosso estabelecimento';
        const sendWhatsAppBirthday = whatsappChannelEnabled(business);

        for (const customer of birthdayCustomers) {
          const customerName = customer.firstName || 'Cliente';
          const message = buildBirthdayMessage({ customerName, businessName });
          let sent = false;

          if (sendWhatsAppBirthday && customer.phone) {
            try {
              const wResult = await sendWhatsApp({
                businessId,
                to: customer.phone,
                text: message,
              });
              if (wResult.success) {
                sent = true;
                logger.info(`[sendBirthdayReminders] WhatsApp sent to customer ${customer.id}`);
              } else {
                logger.warn(
                  `[sendBirthdayReminders] WhatsApp failed for ${customer.id}: ${wResult.error}`
                );
              }
            } catch (error) {
              logger.error(`[sendBirthdayReminders] WhatsApp error for ${customer.id}:`, error);
            }
          }

          if (customer.email) {
            try {
              const result = await sendZeptoEmail({
                to: customer.email,
                subject: `Feliz Aniversário, ${customerName}!`,
                html: message.replace(/\n/g, '<br>'),
                text: message,
              });
              if (result.success) {
                sent = true;
              } else {
                logger.warn(
                  `[sendBirthdayReminders] Email failed for ${customer.id}: ${result.error}`
                );
              }
            } catch (error) {
              logger.error(`[sendBirthdayReminders] Email error for ${customer.id}:`, error);
            }
          }

          if (sent) {
            await db
              .collection('businesses')
              .doc(businessId)
              .collection('customers')
              .doc(customer.id)
              .update({
                lastBirthdayReminderYear: year,
                updatedAt: Timestamp.now(),
              });
          }
        }
      }

      logger.info('[sendBirthdayReminders] Birthday reminders completed');
    } catch (error: unknown) {
      logger.error('[sendBirthdayReminders] Error:', error);
    }
  }
);

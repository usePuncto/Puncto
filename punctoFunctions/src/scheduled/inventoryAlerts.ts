import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { sendZeptoEmail } from '../lib/zeptomail';
// InventoryItem type definition (inline for Firebase Functions)
interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

// Placeholder functions - implement with actual messaging APIs
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
 * Scheduled function that runs daily to check for low stock items
 * and send alerts to business owners/managers
 */
export const checkInventoryAlerts = onSchedule(
  {
    schedule: '0 9 * * *', // Daily at 9 AM
    timeZone: 'America/Sao_Paulo',
  },
  async (event) => {
    logger.info('[checkInventoryAlerts] Starting daily inventory check');

    try {
      const db = getFirestore();
      const businessesSnapshot = await db.collection('businesses').get();

      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const business = businessDoc.data();

        // Get all inventory items
        const inventorySnapshot = await db
          .collection('businesses')
          .doc(businessId)
          .collection('inventory')
          .get();

        const lowStockItems: InventoryItem[] = [];

        inventorySnapshot.docs.forEach((doc) => {
          const item = {
            id: doc.id,
            ...doc.data(),
          } as InventoryItem;

          if (item.currentStock <= item.minStock) {
            lowStockItems.push(item);
          }
        });

        // Send alerts if there are low stock items
        if (lowStockItems.length > 0) {
          const message = `⚠️ Alerta de Estoque Baixo\n\n` +
            `${lowStockItems.length} item(s) com estoque abaixo do mínimo:\n\n` +
            lowStockItems
              .map((item) => `• ${item.name}: ${item.currentStock} ${item.unit} (mínimo: ${item.minStock} ${item.unit})`)
              .join('\n');

          // Send via configured channels
          if (business.settings?.whatsapp?.number) {
            try {
              await sendWhatsAppMessage(business.settings.whatsapp.number, message);
            } catch (error) {
              logger.error(`[checkInventoryAlerts] Failed to send WhatsApp to ${businessId}:`, error);
            }
          }

          if (business.email) {
            try {
              await sendEmail(
                business.email,
                'Alerta de Estoque Baixo',
                message.replace(/\n/g, '<br>')
              );
            } catch (error) {
              logger.error(`[checkInventoryAlerts] Failed to send email to ${businessId}:`, error);
            }
          }

          logger.info(`[checkInventoryAlerts] Sent alerts for ${lowStockItems.length} low stock items to business ${businessId}`);
        }
      }

      logger.info('[checkInventoryAlerts] Daily inventory check completed');
    } catch (error: any) {
      logger.error('[checkInventoryAlerts] Error:', error);
    }
  }
);

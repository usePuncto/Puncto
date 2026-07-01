import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

const db = getFirestore();
const MAX_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 300000; // 5 minutes

function calculateRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY);
}

function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

async function deliverWebhook(webhook: any, event: string, payload: Record<string, any>): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, webhook.secret);

  const response = await fetch(webhook.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Puncto-Event': event,
      'X-Puncto-Signature': signature,
      'X-Puncto-Delivery-Timestamp': new Date().toISOString(),
    },
    body: payloadString,
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(
      `Webhook delivery failed: ${response.status} ${response.statusText} - ${responseText}`
    );
  }
}

/**
 * Process webhook delivery with retry logic
 * Triggered when a new webhook delivery is created
 */
export const onWebhookDeliveryCreated = onDocumentCreated(
  {
    document: 'businesses/{businessId}/webhookDeliveries/{deliveryId}',
  },
  async (event) => {
    const deliveryId = event.params.deliveryId;
    const businessId = event.params.businessId;
    const delivery = event.data?.data();

    if (!delivery) {
      logger.error('[onWebhookDeliveryCreated] No delivery data found');
      return;
    }

    // Only process pending deliveries
    if (delivery.status !== 'pending') {
      return;
    }

    logger.info(
      `[onWebhookDeliveryCreated] Processing delivery ${deliveryId} for webhook ${delivery.webhookId}`
    );

    try {
      // Get webhook
      const webhookRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('webhooks')
        .doc(delivery.webhookId);

      const webhookDoc = await webhookRef.get();

      if (!webhookDoc.exists) {
        logger.error(
          `[onWebhookDeliveryCreated] Webhook ${delivery.webhookId} not found`
        );
        return;
      }

      const webhook = {
        id: webhookDoc.id,
        ...(webhookDoc.data() as { active?: boolean; url?: string; secret?: string }),
      };

      if (!webhook.active) {
        logger.info(
          `[onWebhookDeliveryCreated] Webhook ${delivery.webhookId} is not active, skipping`
        );
        return;
      }

      const deliveryRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('webhookDeliveries')
        .doc(deliveryId);

      const attempts = (delivery.attempts || 0) + 1;

      try {
        await deliverWebhook(webhook, delivery.event, delivery.payload);

        // Success
        await deliveryRef.update({
          status: 'success',
          attempts,
          responseCode: 200,
          deliveredAt: new Date(),
          updatedAt: new Date(),
        });

        logger.info(`[onWebhookDeliveryCreated] Delivery ${deliveryId} succeeded`);
      } catch (error: any) {
        const nextRetryAt = new Date(Date.now() + calculateRetryDelay(attempts));

        if (attempts < MAX_ATTEMPTS) {
          // Schedule retry
          await deliveryRef.update({
            attempts,
            nextRetryAt,
            error: error.message,
            updatedAt: new Date(),
          });

          logger.warn(
            `[onWebhookDeliveryCreated] Delivery ${deliveryId} failed (attempt ${attempts}/${MAX_ATTEMPTS}), will retry`
          );
        } else {
          // Max attempts reached
          await deliveryRef.update({
            status: 'failed',
            attempts,
            error: error.message,
            updatedAt: new Date(),
          });

          logger.error(
            `[onWebhookDeliveryCreated] Delivery ${deliveryId} failed after ${MAX_ATTEMPTS} attempts`
          );
        }
      }
    } catch (error: any) {
      logger.error(
        `[onWebhookDeliveryCreated] Error processing delivery ${deliveryId}:`,
        error
      );

      // Mark delivery as failed
      const deliveryRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('webhookDeliveries')
        .doc(deliveryId);

      await deliveryRef.update({
        status: 'failed',
        error: error.message,
        updatedAt: new Date(),
      });
    }
  }
);

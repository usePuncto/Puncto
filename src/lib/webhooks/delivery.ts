import { db } from '@/lib/firebaseAdmin';
import { Webhook, WebhookDelivery, WebhookEvent } from '@/types/webhooks';
import crypto from 'crypto';
import { validateOutboundWebhookUrl } from '@/lib/webhooks/validateWebhookUrl';

const MAX_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 300000; // 5 minutes

/**
 * Calculate exponential backoff delay for retry
 */
function calculateRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY);
}

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Deliver webhook to external URL
 */
export async function deliverWebhook(
  webhook: Webhook,
  event: WebhookEvent,
  payload: Record<string, any>
): Promise<void> {
  const urlCheck = validateOutboundWebhookUrl(webhook.url);
  if (!urlCheck.ok) {
    throw new Error(`Webhook delivery blocked: ${urlCheck.error}`);
  }

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
 * Create webhook delivery record
 */
export async function createWebhookDelivery(
  webhook: Webhook,
  event: WebhookEvent,
  payload: Record<string, any>
): Promise<string> {
  const deliveryRef = db
    .collection('businesses')
    .doc(webhook.businessId)
    .collection('webhookDeliveries')
    .doc();

  const delivery: Omit<WebhookDelivery, 'id'> = {
    webhookId: webhook.id,
    businessId: webhook.businessId,
    event,
    payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    createdAt: new Date(),
  };

  await deliveryRef.set(delivery);
  return deliveryRef.id;
}

/**
 * Process webhook delivery with retry logic
 */
export async function processWebhookDelivery(
  deliveryId: string,
  webhookId: string,
  businessId: string
): Promise<void> {
  const deliveryRef = db
    .collection('businesses')
    .doc(businessId)
    .collection('webhookDeliveries')
    .doc(deliveryId);

  const webhookRef = db
    .collection('businesses')
    .doc(businessId)
    .collection('webhooks')
    .doc(webhookId);

  const [deliveryDoc, webhookDoc] = await Promise.all([
    deliveryRef.get(),
    webhookRef.get(),
  ]);

  if (!deliveryDoc.exists || !webhookDoc.exists) {
    throw new Error('Webhook or delivery not found');
  }

  const delivery = {
    id: deliveryDoc.id,
    ...deliveryDoc.data(),
  } as WebhookDelivery;

  const webhook = {
    id: webhookDoc.id,
    ...webhookDoc.data(),
  } as Webhook;

  if (delivery.status === 'success') {
    return; // Already delivered
  }

  if (delivery.attempts >= delivery.maxAttempts) {
    await deliveryRef.update({
      status: 'failed',
      error: 'Max retry attempts reached',
      updatedAt: new Date(),
    });
    return;
  }

  const attempts = delivery.attempts + 1;

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
  } catch (error: any) {
    const nextRetryAt = new Date(
      Date.now() + calculateRetryDelay(attempts)
    );

    if (attempts < delivery.maxAttempts) {
      // Schedule retry
      await deliveryRef.update({
        attempts,
        nextRetryAt,
        error: error.message,
        updatedAt: new Date(),
      });
    } else {
      // Max attempts reached
      await deliveryRef.update({
        status: 'failed',
        attempts,
        error: error.message,
        updatedAt: new Date(),
      });
    }
  }
}

/**
 * Trigger webhook for an event
 */
export async function triggerWebhook(
  businessId: string,
  event: WebhookEvent,
  payload: Record<string, any>
): Promise<void> {
  const webhooksSnapshot = await db
    .collection('businesses')
    .doc(businessId)
    .collection('webhooks')
    .where('active', '==', true)
    .where('events', 'array-contains', event)
    .get();

  const promises = webhooksSnapshot.docs.map(async (doc) => {
    const webhook = {
      id: doc.id,
      ...doc.data(),
    } as Webhook;

    // Create delivery record
    const deliveryId = await createWebhookDelivery(webhook, event, payload);

    // Process delivery (async, will retry if needed)
    // In production, this would be queued via Firebase Functions or job queue
    processWebhookDelivery(deliveryId, webhook.id, businessId).catch(
      (error) => {
        console.error(`Failed to process webhook delivery ${deliveryId}:`, error);
      }
    );
  });

  await Promise.all(promises);
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Webhook, WebhookEvent } from '@/types/webhooks';
import crypto from 'crypto';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';
import { validateOutboundWebhookUrl } from '@/lib/webhooks/validateWebhookUrl';

// POST - Register a new webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, url, events } = body;

    if (!businessId || !url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'businessId, url, and events array are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const urlCheck = validateOutboundWebhookUrl(url);
    if (!urlCheck.ok) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }

    // Validate events
    const validEvents: WebhookEvent[] = [
      'booking.created',
      'booking.updated',
      'booking.cancelled',
      'booking.completed',
      'payment.succeeded',
      'payment.failed',
      'payment.refunded',
      'order.created',
      'order.updated',
      'order.paid',
      'customer.created',
      'customer.updated',
    ];

    const invalidEvents = events.filter(
      (e: string) => !validEvents.includes(e as WebhookEvent)
    );
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex');

    // Create webhook
    const webhookRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('webhooks')
      .doc();

    const webhook: Omit<Webhook, 'id'> = {
      businessId,
      url,
      events: events as WebhookEvent[],
      secret,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await webhookRef.set(webhook);

    // Return webhook (without secret for security - secret is only shown once)
    const createdDoc = await webhookRef.get();
    const createdWebhook = {
      id: createdDoc.id,
      ...createdDoc.data(),
      secret, // Return secret only on creation
    } as Webhook;

    return NextResponse.json(createdWebhook, { status: 201 });
  } catch (error) {
    console.error('[webhooks register POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook' },
      { status: 500 }
    );
  }
}

// GET - List webhooks for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const webhooksSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('webhooks')
      .orderBy('createdAt', 'desc')
      .get();

    const webhooks = webhooksSnapshot.docs.map((doc) => {
      const data = doc.data();
      // Don't expose secret in list
      const { secret, ...rest } = data;
      return {
        id: doc.id,
        ...rest,
      };
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('[webhooks register GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}

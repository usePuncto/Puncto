import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { triggerWebhook } from '@/lib/webhooks/delivery';
import { WebhookEvent } from '@/types/webhooks';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// POST - Test a webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, webhookId, event, payload } = body;

    if (!businessId || !webhookId || !event) {
      return NextResponse.json(
        { error: 'businessId, webhookId, and event are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    // Get webhook
    const webhookRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('webhooks')
      .doc(webhookId);

    const webhookDoc = await webhookRef.get();

    if (!webhookDoc.exists) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    const webhook = {
      id: webhookDoc.id,
      ...webhookDoc.data(),
    } as Record<string, any> & { id: string };

    if (!webhook.active) {
      return NextResponse.json(
        { error: 'Webhook is not active' },
        { status: 400 }
      );
    }

    // Trigger webhook with test payload
    const testPayload = payload || {
      test: true,
      timestamp: new Date().toISOString(),
      event,
    };

    try {
      await triggerWebhook(
        businessId,
        event as WebhookEvent,
        testPayload
      );

      return NextResponse.json({
        success: true,
        message: 'Webhook triggered successfully',
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[webhooks test POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to test webhook' },
      { status: 500 }
    );
  }
}

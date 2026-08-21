import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';
import { validateOutboundWebhookUrl } from '@/lib/webhooks/validateWebhookUrl';

// GET - Get webhook details
export async function GET(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
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

    const webhookRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('webhooks')
      .doc(params.webhookId);

    const webhookDoc = await webhookRef.get();

    if (!webhookDoc.exists) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    const data = webhookDoc.data();
    // Don't expose secret
    const { secret, ...rest } = data!;

    return NextResponse.json({
      id: webhookDoc.id,
      ...rest,
    });
  } catch (error) {
    console.error('[webhooks webhookId GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get webhook' },
      { status: 500 }
    );
  }
}

// PATCH - Update webhook
export async function PATCH(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const body = await request.json();

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

    const webhookRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('webhooks')
      .doc(params.webhookId);

    const webhookDoc = await webhookRef.get();

    if (!webhookDoc.exists) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Validate URL if provided
    if (body.url) {
      const urlCheck = validateOutboundWebhookUrl(body.url);
      if (!urlCheck.ok) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 });
      }
    }

    const updates: any = {
      updatedAt: new Date(),
    };

    if (body.url !== undefined) updates.url = body.url;
    if (body.events !== undefined) updates.events = body.events;
    if (body.active !== undefined) updates.active = body.active;

    await webhookRef.update(updates);

    const updatedDoc = await webhookRef.get();
    const data = updatedDoc.data();
    const { secret, ...rest } = data!;

    return NextResponse.json({
      id: updatedDoc.id,
      ...rest,
    });
  } catch (error) {
    console.error('[webhooks webhookId PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

// DELETE - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
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

    const webhookRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('webhooks')
      .doc(params.webhookId);

    const webhookDoc = await webhookRef.get();

    if (!webhookDoc.exists) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    await webhookRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[webhooks webhookId DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}

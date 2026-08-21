import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Campaign } from '@/types/crm';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');

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

    const campaignsRef = db.collection('businesses').doc(businessId).collection('campaigns');
    let query: FirebaseFirestore.Query = campaignsRef.orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const campaigns = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('[campaigns GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, campaign } = body;

    if (!businessId || !campaign) {
      return NextResponse.json(
        { error: 'businessId and campaign are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    if (!campaign.name || !campaign.type || !campaign.template) {
      return NextResponse.json(
        { error: 'name, type, and template are required' },
        { status: 400 }
      );
    }

    const campaignsRef = db.collection('businesses').doc(businessId).collection('campaigns');
    const now = new Date();

    const campaignData: Omit<Campaign, 'id'> = {
      businessId,
      name: campaign.name,
      type: campaign.type,
      segmentIds: campaign.segmentIds || [],
      customerIds: campaign.customerIds,
      template: campaign.template,
      scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt) : undefined,
      status: campaign.status || 'draft',
      stats: {
        sent: 0,
        delivered: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await campaignsRef.add(campaignData);

    return NextResponse.json({
      id: docRef.id,
      ...campaignData,
    });
  } catch (error) {
    console.error('[campaigns POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

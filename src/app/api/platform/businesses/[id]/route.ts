import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

/**
 * Verify platform admin access
 */
async function verifyPlatformAdmin(request: NextRequest): Promise<{ uid: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      if (decodedToken.platformAdmin === true) {
        return { uid: decodedToken.uid };
      }
    } else {
      const cookies = request.cookies.getAll();
      const sessionCookie = cookies.find(c => c.name === '__session' || c.name === 'firebase-auth-token');
      if (sessionCookie) {
        const decoded = await auth.verifySessionCookie(sessionCookie.value, true);
        if (decoded.platformAdmin === true) {
          return { uid: decoded.uid };
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * GET /api/platform/businesses/[id]
 * Get business details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessDoc = await db.collection('businesses').doc(params.id).get();

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const data = businessDoc.data();
    const business = {
      id: businessDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
    };

    return NextResponse.json({ business });
  } catch (error: any) {
    console.error('[Platform API] Error fetching business:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/platform/businesses/[id]
 * Update business (suspend, change tier, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const businessRef = db.collection('businesses').doc(params.id);

    const businessDoc = await businessRef.get();
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Allowed fields for admin update
    const allowedFields: string[] = [
      'subscription.status',
      'subscription.tier',
      'subscription.planId',
      'subscription.stripeCustomerId',
      'subscription.stripeSubscriptionId',
      'subscription.stripePriceId',
      'subscription.cancelAtPeriodEnd',
      'subscription.currentPeriodEnd',
      'subscription.trialEndsAt',
      'features',
      'enabledModules',
      'industry',
    ];

    const updates: any = {
      updatedAt: new Date(),
    };

    // Handle subscription updates
    if (body.subscription) {
      const currentData = businessDoc.data();
      const currentSubscription = currentData?.subscription || {};

      const { planIdToTier } = await import('@/content/businessModules');
      const nextSubscription = {
        ...currentSubscription,
        ...body.subscription,
      };

      // Keep legacy tier in sync when commercial planId is set
      if (body.subscription.planId) {
        nextSubscription.tier = planIdToTier(body.subscription.planId);
      }

      updates['subscription'] = nextSubscription;

      // If tier/plan changed, update base features from tier defaults
      const nextTier = nextSubscription.tier;
      if (nextTier && nextTier !== currentSubscription.tier) {
        const { TIER_FEATURES } = await import('@/types/features');
        const newTierFeatures = TIER_FEATURES[nextTier as keyof typeof TIER_FEATURES];
        if (newTierFeatures) {
          updates['features'] = newTierFeatures;
        }
      }
    }

    // Handle direct feature updates
    if (body.features) {
      const currentFeatures = updates['features'] || businessDoc.data()?.features || {};
      updates['features'] = {
        ...currentFeatures,
        ...body.features,
      };
    }

    // Handle per-business module toggles
    if (body.enabledModules && typeof body.enabledModules === 'object') {
      updates['enabledModules'] = body.enabledModules;

      const { featuresFromEnabledModules } = await import('@/content/businessModules');
      const industry = body.industry || businessDoc.data()?.industry || 'general';
      const baseFeatures = updates['features'] || businessDoc.data()?.features || {};
      updates['features'] = featuresFromEnabledModules(industry, body.enabledModules, baseFeatures);
    }

    // Handle industry change
    if (body.industry) {
      updates['industry'] = body.industry;
    }

    await businessRef.update(updates);

    // Fetch updated document
    const updatedDoc = await businessRef.get();
    const data = updatedDoc.data();
    
    return NextResponse.json({
      id: updatedDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
    });
  } catch (error: any) {
    console.error('[Platform API] Error updating business:', error);
    return NextResponse.json(
      { error: 'Failed to update business', message: error.message },
      { status: 500 }
    );
  }
}

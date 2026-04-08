import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Business } from '@/types/business';

/**
 * Verify platform admin access
 */
async function verifyPlatformAdmin(request: NextRequest): Promise<{ uid: string } | null> {
  try {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else {
      // Try to get from cookie (set by Firebase client SDK)
      const cookies = request.cookies.getAll();
      const sessionCookie = cookies.find(c => c.name === '__session' || c.name === 'firebase-auth-token');
      if (sessionCookie) {
        const decoded = await auth.verifySessionCookie(sessionCookie.value, true);
        if (decoded.platformAdmin === true) {
          return { uid: decoded.uid };
        }
      }
      return null;
    }

    if (!token) return null;

    // Verify ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check platform admin claim
    if (decodedToken.platformAdmin !== true) {
      return null;
    }

    return { uid: decodedToken.uid };
  } catch (error) {
    console.error('[Platform API] Auth error:', error);
    return null;
  }
}

/**
 * GET /api/platform/businesses
 * List all businesses with filters
 */
export async function GET(request: NextRequest) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, suspended, all
    const tier = searchParams.get('tier'); // free, basic, pro, enterprise
    const industry = searchParams.get('industry');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    let query = db.collection('businesses').where('deletedAt', '==', null);

    // Apply filters
    if (status === 'active') {
      query = query.where('subscription.status', '==', 'active') as any;
    } else if (status === 'suspended') {
      query = query.where('subscription.status', '==', 'suspended') as any;
    }

    if (tier) {
      query = query.where('subscription.tier', '==', tier) as any;
    }

    if (industry) {
      query = query.where('industry', '==', industry) as any;
    }

    // Note: Firestore doesn't support text search natively
    // In production, use Algolia or similar for search
    const snapshot = await query.limit(limit).offset(skip).get();

    let businesses = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    // Apply text search filter (client-side, basic)
    if (search) {
      const searchLower = search.toLowerCase();
      businesses = businesses.filter((b: any) =>
        b.displayName?.toLowerCase().includes(searchLower) ||
        b.email?.toLowerCase().includes(searchLower) ||
        b.slug?.toLowerCase().includes(searchLower)
      );
    }

    // Get total count (approximate for pagination)
    const totalSnapshot = await db.collection('businesses').where('deletedAt', '==', null).count().get();
    const total = totalSnapshot.data().count;

    return NextResponse.json({
      businesses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Platform API] Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platform/businesses
 * Create a new business (admin only)
 */
export async function POST(request: NextRequest) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      displayName,
      legalName,
      email,
      phone,
      slug,
      industry,
      tier = 'free',
    } = body;

    // Validate required fields
    if (!displayName || !email || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: displayName, email, slug' },
        { status: 400 }
      );
    }

    // Validate business type (industry) - required for feature access control
    if (!industry || !['salon', 'clinic', 'restaurant', 'bakery', 'event', 'general', 'education'].includes(industry)) {
      return NextResponse.json(
        { error: 'Valid industry is required. Must be one of: salon, clinic, restaurant, bakery, event, general, education' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingSlug = await db.collection('businesses').where('slug', '==', slug).get();
    if (!existingSlug.empty) {
      return NextResponse.json(
        { error: 'Business with this slug already exists' },
        { status: 409 }
      );
    }

    // Get tier features
    const { TIER_FEATURES } = await import('@/types/features');
    const tierFeatures = TIER_FEATURES[tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.free;

    // Create business document
    const businessData: Partial<Business> = {
      slug,
      displayName,
      legalName: legalName || displayName,
      email,
      phone: phone || '',
      industry: industry || 'general',
      subscription: {
        tier: tier as any,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        billingEmail: email,
      },
      features: tierFeatures as any,
      settings: {
        timezone: 'America/Sao_Paulo',
        locale: 'pt-BR',
        currency: 'BRL',
        bookingWindow: 30,
        cancellationPolicy: {
          enabled: false,
          hoursBeforeService: 24,
        },
        workingHours: {},
      },
      branding: {
        gallery: [],
      },
      address: {
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'BR',
      },
      about: '',
      taxId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: admin.uid,
      dataRetentionDays: 365,
      consentVersion: '1.0',
    };

    const businessRef = await db.collection('businesses').add(businessData);

    return NextResponse.json({
      id: businessRef.id,
      ...businessData,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Platform API] Error creating business:', error);
    return NextResponse.json(
      { error: 'Failed to create business', message: error.message },
      { status: 500 }
    );
  }
}

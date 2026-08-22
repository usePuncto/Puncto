import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { verifyPlatformAdmin } from '@/lib/auth/verifyPlatformAdmin';
import { Business } from '@/types/business';

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

    let query: FirebaseFirestore.Query = db.collection('businesses');

    // Apply filters
    if (status === 'active') {
      query = query.where('subscription.status', '==', 'active');
    } else if (status === 'suspended') {
      query = query.where('subscription.status', '==', 'suspended');
    }

    if (tier) {
      query = query.where('subscription.tier', '==', tier);
    }

    if (industry) {
      query = query.where('industry', '==', industry);
    }

    const snapshot = await query.get();

    let businesses = snapshot.docs
      .filter((doc) => !doc.data().deletedAt)
      .map((doc) => {
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

    const total = businesses.length;
    businesses = businesses.slice(skip, skip + limit);

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
      taxId,
      planId,
      tier: tierInput,
      status = 'active',
      enabledModules,
    } = body;

    // Validate required fields
    if (!displayName || !email || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: displayName, email, slug' },
        { status: 400 }
      );
    }

    // Validate business type (industry) - required for feature access control
    if (!industry || !['salon', 'clinic', 'restaurant', 'bakery', 'event', 'general', 'empresas', 'corporativo', 'education'].includes(industry)) {
      return NextResponse.json(
        { error: 'Valid industry is required. Must be one of: salon, clinic, restaurant, bakery, event, general, empresas, corporativo, education' },
        { status: 400 }
      );
    }

    const normalizedSlug = String(slug)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!normalizedSlug) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });
    }

    // Check if slug already exists
    const existingSlug = await db.collection('businesses').where('slug', '==', normalizedSlug).get();
    if (!existingSlug.empty) {
      return NextResponse.json(
        { error: 'Já existe um negócio com este identificador (slug)' },
        { status: 409 }
      );
    }

    const {
      planIdToTier,
      defaultEnabledModules,
      featuresFromEnabledModules,
    } = await import('@/content/businessModules');

    const resolvedPlanId =
      planId && ['gratis', 'starter', 'growth', 'pro'].includes(planId)
        ? planId
        : undefined;
    const tier = resolvedPlanId
      ? planIdToTier(resolvedPlanId)
      : (['free', 'basic', 'pro', 'enterprise'].includes(tierInput) ? tierInput : 'free');

    const { TIER_FEATURES } = await import('@/types/features');
    const tierFeatures = TIER_FEATURES[tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.free;

    const modules =
      enabledModules && typeof enabledModules === 'object'
        ? enabledModules
        : defaultEnabledModules(industry);
    const features = featuresFromEnabledModules(industry, modules, tierFeatures as any);

    const now = new Date();
    const businessRef = db.collection('businesses').doc();

    // Create business document
    const businessData: Partial<Business> = {
      id: businessRef.id,
      slug: normalizedSlug,
      displayName: String(displayName).trim(),
      legalName: (legalName || displayName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone || '',
      industry,
      taxId: taxId || '',
      subscription: {
        tier: tier as any,
        ...(resolvedPlanId ? { planId: resolvedPlanId } : {}),
        status: (['active', 'trial', 'suspended', 'cancelled', 'pending_payment'].includes(status)
          ? status
          : 'active') as any,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        billingEmail: String(email).trim().toLowerCase(),
      },
      features: features as any,
      enabledModules: modules,
      settings: {
        timezone: 'America/Sao_Paulo',
        locale: 'pt-BR',
        currency: 'BRL',
        bookingWindow: 30,
        cancellationPolicy: {
          enabled: false,
          hoursBeforeService: 24,
        },
        workingHours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '14:00', closed: false },
          sunday: { open: '09:00', close: '14:00', closed: true },
        },
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
      createdAt: now,
      updatedAt: now,
      createdBy: admin.uid,
      dataRetentionDays: 365,
      consentVersion: '1.0',
      marketplaceEnabled: false,
    };

    await businessRef.set(businessData);

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

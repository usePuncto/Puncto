import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { auth, db } from '@/lib/firebaseAdmin';
import { createSubscriptionCheckout, getOrCreateCustomer } from '@/lib/stripe/subscriptions';
import { getFeaturesByTier } from '@/types/features';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticação ausente' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token inválido' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Parse request body
    const body = await request.json();
    const {
      displayName,
      legalName,
      taxId,
      email,
      phone,
      industry,
      selectedPlan,
      billingPeriod = 'monthly',
      stripePriceId,
    } = body;

    // Validation (stripePriceId can be resolved from selectedPlan for paid plans)
    if (!displayName || !legalName || !taxId || !email || !phone || !industry || !selectedPlan) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Resolve Stripe price ID from selectedPlan + billingPeriod (server-side)
    // Monthly prices: STRIPE_PRICE_ID_STARTER, etc.
    // Annual prices: STRIPE_PRICE_ID_STARTER_ANNUAL, etc. (add to .env when you create them in Stripe)
    const isAnnual = billingPeriod === 'annual';
    const priceIdMap: Record<string, string> = isAnnual
      ? {
          starter: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL || process.env.STRIPE_PRICE_ID_STARTER || '',
          growth: process.env.STRIPE_PRICE_ID_GROWTH_ANNUAL || process.env.STRIPE_PRICE_ID_GROWTH || '',
          pro: process.env.STRIPE_PRICE_ID_PRO_ANNUAL || process.env.STRIPE_PRICE_ID_PRO || '',
        }
      : {
          starter: process.env.STRIPE_PRICE_ID_STARTER || '',
          growth: process.env.STRIPE_PRICE_ID_GROWTH || '',
          pro: process.env.STRIPE_PRICE_ID_PRO || '',
        };
    const resolvedPriceId = stripePriceId || priceIdMap[selectedPlan];
    if (!resolvedPriceId) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Plano inválido ou configuração de pagamento ausente' },
        { status: 400 }
      );
    }

    // Generate slug from displayName
    const slug = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existingBusiness = await db
      .collection('businesses')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (!existingBusiness.empty) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Um negócio com este nome já existe' },
        { status: 400 }
      );
    }

    // Map plan ID to tier
    const tierMap: Record<string, 'free' | 'basic' | 'pro' | 'enterprise'> = {
      starter: 'basic',
      growth: 'pro',
      pro: 'pro',
      enterprise: 'enterprise',
    };

    const tier = tierMap[selectedPlan] || 'basic';

    // Create or get Stripe customer
    const stripeCustomer = await getOrCreateCustomer({
      email,
      name: displayName,
      metadata: {
        businessName: displayName,
        taxId,
        userId,
      },
    });

    // Create business document with pending_payment status
    const businessRef = db.collection('businesses').doc();
    const businessId = businessRef.id;

    const now = Timestamp.now();
    const features = getFeaturesByTier(tier);

    const businessData = {
      id: businessId,
      slug,
      displayName,
      legalName,
      taxId,
      email,
      phone,
      industry,
      about: '',
      branding: {
        logoUrl: '',
        coverUrl: '',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
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
      subscription: {
        tier,
        status: 'pending_payment' as const,
        currentPeriodStart: now,
        currentPeriodEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        billingEmail: email,
        stripeCustomerId: stripeCustomer.id,
        stripePriceId: resolvedPriceId,
      },
      features,
      settings: {
        timezone: 'America/Sao_Paulo',
        locale: 'pt-BR' as const,
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
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      dataRetentionDays: 730,
      consentVersion: '1.0',
      marketplaceEnabled: false,
    };

    await businessRef.set(businessData);

    // Create owner as Professional so they appear in professional dashboard and agenda
    const userRecord = await auth.getUser(userId);
    const prosRef = businessRef.collection('professionals');
    const ownerProfessionalData = {
      businessId,
      userId,
      name: userRecord.displayName || displayName || userRecord.email?.split('@')[0] || 'Proprietário',
      email: userRecord.email || email,
      phone,
      specialties: [],
      locationIds: [],
      active: true,
      canBookOnline: true,
      isOwner: true,
      workingHours: businessData.settings.workingHours,
      createdAt: now,
      updatedAt: now,
    };
    await prosRef.add(ownerProfessionalData);

    // Create Stripe Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutSession = await createSubscriptionCheckout({
      customerId: stripeCustomer.id,
      priceId: resolvedPriceId,
      successUrl: `${baseUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/industries?canceled=true`,
      metadata: {
        businessId,
        userId,
        tier,
      },
    });

    // Store checkout session ID in business document
    await businessRef.update({
      'subscription.stripeCheckoutSessionId': checkoutSession.id,
    });

    // Get existing custom claims (if any)
    const existingClaims = userRecord.customClaims || {};

    // Set custom claims for the user as business_user with owner role
    await auth.setCustomUserClaims(userId, {
      ...existingClaims,
      userType: 'business_user',
      businessRoles: {
        ...(existingClaims.businessRoles || {}),
        [businessId]: 'owner',
      },
      primaryBusinessId: businessId,
      // Remove customer-specific claims if they exist
      customerId: undefined,
      // Remove platform admin claims if they exist (shouldn't happen but safety)
      platformAdmin: undefined,
      platformRole: undefined,
    });

    // Update user document in Firestore
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.set({
      id: userId,
      email: userRecord.email,
      displayName: userRecord.displayName || displayName,
      type: 'business_user',
      businessId,
      primaryBusinessId: businessId,
      role: 'owner',
      updatedAt: now,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      businessId,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error: any) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Erro ao criar negócio' },
      { status: 500 }
    );
  }
}

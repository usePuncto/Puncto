import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { auth, db } from '@/lib/firebaseAdmin';
import { getFeaturesByTier } from '@/types/features';

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { displayName, legalName, taxId, email, phone, industry } = body;

    if (!displayName || !legalName || !taxId || !email || !phone || !industry) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    const slug = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

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

    const businessRef = db.collection('businesses').doc();
    const businessId = businessRef.id;
    const now = Timestamp.now();
    const features = getFeaturesByTier('free');

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
        tier: 'free' as const,
        status: 'active' as const,
        currentPeriodStart: now,
        currentPeriodEnd: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        billingEmail: email,
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

    const existingClaims = userRecord.customClaims || {};

    await auth.setCustomUserClaims(userId, {
      ...existingClaims,
      userType: 'business_user',
      businessRoles: {
        ...(existingClaims.businessRoles || {}),
        [businessId]: 'owner',
      },
      primaryBusinessId: businessId,
      customerId: undefined,
      platformAdmin: undefined,
      platformRole: undefined,
    });

    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.set(
      {
        id: userId,
        email: userRecord.email,
        displayName: userRecord.displayName || displayName,
        type: 'business_user',
        businessId,
        primaryBusinessId: businessId,
        role: 'owner',
        updatedAt: now,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      businessId,
      redirectUrl: `/tenant?subdomain=${businessId}`,
    });
  } catch (error: any) {
    console.error('Error creating free business:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Erro ao criar negócio' },
      { status: 500 }
    );
  }
}

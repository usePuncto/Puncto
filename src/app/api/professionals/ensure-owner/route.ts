import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * POST - Ensure owner has a Professional document (creates if missing)
 * Called when owner visits professional dashboard and no professional is found
 */
export async function POST(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email || '';
    const displayName = decodedToken.name || userEmail.split('@')[0] || 'Proprietário';

    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessSnap.data();
    const role = (decodedToken as { businessRoles?: Record<string, string> }).businessRoles?.[businessId];
    if (role !== 'owner' && role !== 'manager') {
      return NextResponse.json({ error: 'Must be owner or manager' }, { status: 403 });
    }

    const prosRef = businessRef.collection('professionals');
    const existing = await prosRef.where('userId', '==', userId).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({
        professionalId: existing.docs[0].id,
        created: false,
      });
    }

    const byEmail = await prosRef.where('email', '==', userEmail).limit(1).get();
    if (!byEmail.empty) {
      const proDoc = byEmail.docs[0];
      await proDoc.ref.update({
        userId,
        isOwner: true,
        updatedAt: new Date(),
      });
      return NextResponse.json({
        professionalId: proDoc.id,
        created: false,
        linked: true,
      });
    }

    const settings = businessData?.settings || {};
    const wh = settings.workingHours || {};

    const professionalData = {
      businessId,
      userId,
      name: displayName,
      email: userEmail,
      phone: businessData?.phone || '',
      specialties: [],
      locationIds: [],
      active: true,
      canBookOnline: true,
      isOwner: true,
      workingHours: {
        monday: wh.monday || { open: '09:00', close: '18:00', closed: false },
        tuesday: wh.tuesday || { open: '09:00', close: '18:00', closed: false },
        wednesday: wh.wednesday || { open: '09:00', close: '18:00', closed: false },
        thursday: wh.thursday || { open: '09:00', close: '18:00', closed: false },
        friday: wh.friday || { open: '09:00', close: '18:00', closed: false },
        saturday: wh.saturday || { open: '09:00', close: '14:00', closed: false },
        sunday: wh.sunday || { open: '09:00', close: '14:00', closed: true },
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await prosRef.add(professionalData);

    return NextResponse.json({
      professionalId: docRef.id,
      created: true,
    });
  } catch (error) {
    console.error('[ensure-owner] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

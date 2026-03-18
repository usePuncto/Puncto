import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Store patient consent signature (canvas) with basic audit trail.
 * Path: businesses/{businessId}/patients/{patientId}/consents/{consentId}
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await auth.verifyIdToken(token);

    const body = await request.json();
    const { base64Image, patientId, businessId, textHash } = body;

    if (!base64Image || !patientId || !businessId || !textHash) {
      return NextResponse.json(
        { error: 'Missing required fields: base64Image, patientId, businessId, textHash' },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for') ||
      // Next.js 14 may also expose real IP via request.ip in some runtimes
      // but we fallback to empty string if not available
      // @ts-ignore
      (request.ip as string | undefined) ||
      '';
    const userAgent = request.headers.get('user-agent') || '';

    const consentsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('patients')
      .doc(patientId)
      .collection('consents');

    const docRef = await consentsRef.add({
      base64Image,
      textHash,
      ip,
      userAgent,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ id: docRef.id });
  } catch (err) {
    console.error('Patient consent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to store patient consent' },
      { status: 500 }
    );
  }
}


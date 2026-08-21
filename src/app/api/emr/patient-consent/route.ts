import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { authError, requireBusinessAuth } from '@/lib/auth/requireBusinessAuth';

/**
 * Store patient consent signature (canvas) with basic audit trail.
 * Path: businesses/{businessId}/patients/{patientId}/consents/{consentId}
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Image, patientId, businessId, textHash } = body;

    if (!base64Image || !patientId || !businessId || !textHash) {
      return NextResponse.json(
        { error: 'Missing required fields: base64Image, patientId, businessId, textHash' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId);
    if (authError(authResult)) return authResult.error;

    const ip =
      request.headers.get('x-forwarded-for') ||
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
      createdBy: authResult.actor.uid,
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

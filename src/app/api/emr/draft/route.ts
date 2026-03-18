import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export type EMRStatus = 'draft' | 'signed';

/**
 * Save EMR draft to Firestore.
 * Schema: businesses/{businessId}/patients/{patientId}/emrs/{emrId}
 * Document includes: payload and status: 'draft'
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await auth.verifyIdToken(token);
    const userId = decoded.uid;

    const body = await request.json();
    const { businessId, patientId, payload } = body;

    if (!businessId || !patientId || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, patientId, payload' },
        { status: 400 }
      );
    }

    const emrsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('patients')
      .doc(patientId)
      .collection('emrs');

    const docRef = await emrsRef.add({
      payload: payload as Record<string, unknown>,
      status: 'draft' as const,
      createdAt: Timestamp.now(),
      createdBy: userId,
    });

    return NextResponse.json({
      emrId: docRef.id,
    });
  } catch (err) {
    console.error('EMR draft save error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save draft' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Mark an EMR as finalized (saved).
 * Accepts emrId, businessId, patientId and sets status: 'signed', signedAt.
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
    const { emrId, businessId, patientId } = body;

    if (!emrId || !businessId || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: emrId, businessId, patientId' },
        { status: 400 }
      );
    }

    const emrRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('patients')
      .doc(patientId)
      .collection('emrs')
      .doc(emrId);

    await emrRef.update({
      status: 'signed',
      signedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('EMR complete error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save EMR' },
      { status: 500 }
    );
  }
}

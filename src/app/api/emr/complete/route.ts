import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Mark an EMR as signed by the doctor (ICP-Brasil).
 * Accepts emrId, businessId, patientId, signedHash and sets status: 'signed', signedHash, signedAt.
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
    const { emrId, businessId, patientId, signedHash } = body;

    if (!emrId || !businessId || !patientId || !signedHash) {
      return NextResponse.json(
        { error: 'Missing required fields: emrId, businessId, patientId, signedHash' },
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
      signedHash,
      signedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('EMR complete error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to sign EMR' },
      { status: 500 }
    );
  }
}


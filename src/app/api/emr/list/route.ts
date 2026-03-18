import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

/**
 * Fetch signed EMR records for a patient (server-side, bypasses client Firestore rules)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await auth.verifyIdToken(token);

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const patientId = searchParams.get('patientId');

    if (!businessId || !patientId) {
      return NextResponse.json(
        { error: 'Missing businessId or patientId' },
        { status: 400 }
      );
    }

    const emrsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('patients')
      .doc(patientId)
      .collection('emrs');

    const snapshot = await emrsRef.where('status', '==', 'signed').get();

    const emrs = snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          payload: data.payload || {},
          status: data.status,
          createdAt: (data.createdAt as FirebaseFirestore.Timestamp)?.toDate?.()?.toISOString() ?? data.createdAt,
          signedAt: (data.signedAt as FirebaseFirestore.Timestamp)?.toDate?.()?.toISOString() ?? data.signedAt,
          createdBy: data.createdBy,
        };
      })
      .sort((a, b) => {
        const at = a.signedAt
          ? new Date(a.signedAt as string).getTime()
          : new Date(a.createdAt as string).getTime();
        const bt = b.signedAt
          ? new Date(b.signedAt as string).getTime()
          : new Date(b.createdAt as string).getTime();
        return bt - at;
      });

    return NextResponse.json(emrs);
  } catch (err) {
    console.error('EMR list error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch EMRs' },
      { status: 500 }
    );
  }
}

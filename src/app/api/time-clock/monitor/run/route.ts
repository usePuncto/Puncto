import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { applyAvailabilityProbe } from '@/lib/time-clock/health';

export const dynamic = 'force-dynamic';

/**
 * POST /api/time-clock/monitor/run
 * Internal scheduler entry — secret header only (no Firebase user).
 * Independent of UI /health pageviews.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-rep-p-monitor-secret');
  const expected = process.env.REP_P_MONITOR_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const businessId = (body as { businessId?: string }).businessId;

  if (businessId) {
    const doc = await db.collection('businesses').doc(businessId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    const business = {
      taxId: String(doc.data()?.taxId || ''),
      legalName: String(doc.data()?.legalName || doc.data()?.displayName || ''),
      displayName: String(doc.data()?.displayName || ''),
    };
    const report = await applyAvailabilityProbe({
      businessId,
      business,
      writeTransitions: true,
      createdBy: 'system:scheduler-monitor',
    });
    return NextResponse.json(report);
  }

  // Sweep businesses with ponto module (`enabledModules` pode ser mapa ou array)
  const businesses = db.collection('businesses');
  const [mapSnap, arraySnap] = await Promise.all([
    businesses.where('enabledModules.ponto_eletronico', '==', true).limit(200).get(),
    businesses.where('enabledModules', 'array-contains', 'ponto_eletronico').limit(200).get(),
  ]);
  const docs = new Map(
    [...mapSnap.docs, ...arraySnap.docs].map((doc) => [doc.id, doc] as const),
  );
  const results: Array<{ businessId: string; available: boolean; transitionRecorded: boolean }> =
    [];

  for (const doc of docs.values()) {
    const data = doc.data();
    try {
      const report = await applyAvailabilityProbe({
        businessId: doc.id,
        business: {
          taxId: data.taxId || '',
          legalName: data.legalName,
          displayName: data.displayName || '',
        },
        writeTransitions: true,
        createdBy: 'system:scheduler-monitor',
      });
      results.push({
        businessId: doc.id,
        available: report.available,
        transitionRecorded: report.transitionRecorded,
      });
    } catch (e) {
      console.error('[monitor/run]', doc.id, e);
    }
  }

  return NextResponse.json({ checked: results.length, results });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing businessId parameter' },
        { status: 400 }
      );
    }

    const start = startDate ? Timestamp.fromDate(new Date(startDate)) : null;
    const end = endDate ? Timestamp.fromDate(new Date(endDate + 'T23:59:59.999')) : null;

    const startMs = start ? start.toMillis() : null;
    const endMs = end ? end.toMillis() : null;

    const toMillis = (value: any): number | null => {
      if (!value) return null;
      if (typeof value?.toMillis === 'function') return value.toMillis();
      if (value instanceof Date) return value.getTime();
      return null;
    };

    const inRange = (millis: number | null) => {
      if (millis === null) return false;
      if (startMs !== null && millis < startMs) return false;
      if (endMs !== null && millis > endMs) return false;
      return true;
    };

    const periodKeyForDate = (date: Date) => (
      period === 'daily'
        ? date.toISOString().split('T')[0]
        : period === 'weekly'
          ? `${date.getFullYear()}-W${getWeekNumber(date)}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    );

    // Manual cash from ledgerEntries (filter by type/date in memory)
    const ledgerRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('ledgerEntries');

    const inflows: Record<string, number> = {};
    const outflows: Record<string, number> = {};

    // Cash account movements
    const cashLedgerSnapshot = await ledgerRef
      .where('account', '==', 'cash')
      .get();

    cashLedgerSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      const dateMs = toMillis(data.date);
      if (!inRange(dateMs)) return;
      const date = dateMs !== null ? new Date(dateMs) : null;
      if (!date) return;

      const key = periodKeyForDate(date);
      if (data.type === 'debit') {
        inflows[key] = (inflows[key] || 0) + (data.amount || 0);
      } else if (data.type === 'credit') {
        outflows[key] = (outflows[key] || 0) + (data.amount || 0);
      }
    });

    // Manual revenue (credit) = cash inflow, manual expenses (debit) = cash outflow
    const [revenueSnapshot, expensesSnapshot] = await Promise.all([
      ledgerRef.where('account', '==', 'revenue').get(),
      ledgerRef.where('account', '==', 'expenses').get(),
    ]);

    revenueSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.type !== 'credit') return;
      const dateMs = toMillis(data.date);
      if (!inRange(dateMs)) return;
      const date = dateMs !== null ? new Date(dateMs) : null;
      if (!date) return;
      const key = periodKeyForDate(date);
      inflows[key] = (inflows[key] || 0) + (data.amount || 0);
    });

    expensesSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.type !== 'debit') return;
      const dateMs = toMillis(data.date);
      if (!inRange(dateMs)) return;
      const date = dateMs !== null ? new Date(dateMs) : null;
      if (!date) return;
      const key = periodKeyForDate(date);
      outflows[key] = (outflows[key] || 0) + (data.amount || 0);
    });

    // Stripe-derived movements: do simple queries and filter by date in memory.
    const derivedInflows: Record<string, number> = {};
    const derivedOutflows: Record<string, number> = {};

    // Payments succeeded => cash inflow
    const paymentsSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('payments')
      .where('status', '==', 'succeeded')
      .get();
    paymentsSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      const succeededAtMs = toMillis(data.succeededAt);
      if (!inRange(succeededAtMs)) return;
      const date = succeededAtMs !== null ? new Date(succeededAtMs) : null;
      if (!date) return;
      const key = periodKeyForDate(date);
      derivedInflows[key] = (derivedInflows[key] || 0) + (data.amount || 0);
    });

    // Commissions processing/paid => cash outflow
    const commissionsSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('commissions')
      .where('status', 'in', ['processing', 'paid'])
      .get();
    commissionsSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      const createdAtMs = toMillis(data.createdAt);
      if (!inRange(createdAtMs)) return;
      const date = createdAtMs !== null ? new Date(createdAtMs) : null;
      if (!date) return;
      const key = periodKeyForDate(date);
      derivedOutflows[key] = (derivedOutflows[key] || 0) + (data.amount || 0);
    });

    // Refunds succeeded => cash outflow
    // Requires collection group index on refunds.businessId - wraps in try/catch if index missing
    try {
      const refundsSnapshot = await db
        .collectionGroup('refunds')
        .where('businessId', '==', businessId)
        .get();
      refundsSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.status !== 'succeeded') return;
      const createdAtMs = toMillis(data.createdAt);
      if (!inRange(createdAtMs)) return;
      const date = createdAtMs !== null ? new Date(createdAtMs) : null;
      if (!date) return;
      const key = periodKeyForDate(date);
      derivedOutflows[key] = (derivedOutflows[key] || 0) + (data.amount || 0);
    });
    } catch (refundsErr) {
      console.warn('[cashflow-report] Skipping refunds collectionGroup query (index may be missing):', (refundsErr as Error)?.message);
    }

    const allPeriods = new Set([
      ...Object.keys(inflows),
      ...Object.keys(outflows),
      ...Object.keys(derivedInflows),
      ...Object.keys(derivedOutflows),
    ]);

    const cashflow = Array.from(allPeriods)
      .sort()
      .map((periodKey) => ({
        period: periodKey,
        inflow: (inflows[periodKey] || 0) + (derivedInflows[periodKey] || 0),
        outflow: (outflows[periodKey] || 0) + (derivedOutflows[periodKey] || 0),
        netFlow:
          ((inflows[periodKey] || 0) + (derivedInflows[periodKey] || 0))
          - ((outflows[periodKey] || 0) + (derivedOutflows[periodKey] || 0)),
      }));

    const totalInflow = cashflow.reduce((sum, row) => sum + (row.inflow || 0), 0);
    const totalOutflow = cashflow.reduce((sum, row) => sum + (row.outflow || 0), 0);

    return NextResponse.json({
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
        grouping: period,
      },
      cashflow,
      summary: {
        totalInflow,
        totalOutflow,
        netFlow: totalInflow - totalOutflow,
      },
    });
  } catch (error) {
    console.error('[cashflow-report] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate cash flow report: ${errorMessage}` },
      { status: 500 }
    );
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

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
    const end = endDate ? Timestamp.fromDate(new Date(endDate)) : null;

    // Get cash inflows (debits to cash account)
    const ledgerRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('ledgerEntries');

    let inflowsQuery = ledgerRef
      .where('account', '==', 'cash')
      .where('type', '==', 'debit');

    if (start && end) {
      inflowsQuery = inflowsQuery
        .where('date', '>=', start)
        .where('date', '<=', end) as any;
    }

    const inflowsSnapshot = await inflowsQuery.get();
    const inflows: Record<string, number> = {};
    inflowsSnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.date?.toDate();
      if (!date) return;

      const key = period === 'daily'
        ? date.toISOString().split('T')[0]
        : period === 'weekly'
        ? `${date.getFullYear()}-W${getWeekNumber(date)}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      inflows[key] = (inflows[key] || 0) + (data.amount || 0);
    });

    // Get cash outflows (credits to cash account)
    let outflowsQuery = ledgerRef
      .where('account', '==', 'cash')
      .where('type', '==', 'credit');

    if (start && end) {
      outflowsQuery = outflowsQuery
        .where('date', '>=', start)
        .where('date', '<=', end) as any;
    }

    const outflowsSnapshot = await outflowsQuery.get();
    const outflows: Record<string, number> = {};
    outflowsSnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.date?.toDate();
      if (!date) return;

      const key = period === 'daily'
        ? date.toISOString().split('T')[0]
        : period === 'weekly'
        ? `${date.getFullYear()}-W${getWeekNumber(date)}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      outflows[key] = (outflows[key] || 0) + (data.amount || 0);
    });

    // Combine into periods
    const allPeriods = new Set([...Object.keys(inflows), ...Object.keys(outflows)]);
    const cashflow = Array.from(allPeriods)
      .sort()
      .map((period) => ({
        period,
        inflow: inflows[period] || 0,
        outflow: outflows[period] || 0,
        netFlow: (inflows[period] || 0) - (outflows[period] || 0),
      }));

    const totalInflow = Object.values(inflows).reduce((sum, val) => sum + val, 0);
    const totalOutflow = Object.values(outflows).reduce((sum, val) => sum + val, 0);

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

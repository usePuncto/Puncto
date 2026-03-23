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

    const paymentsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('payments');

    // Revenue: succeeded payments (Pix/Card) filtered by succeededAt in memory.
    const paymentsSnapshot = await paymentsRef.where('status', '==', 'succeeded').get();
    let revenue = 0;
    paymentsSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      const succeededAtMs = toMillis(data.succeededAt);
      if (!inRange(succeededAtMs)) return;
      revenue += data.amount || 0;
    });

    const ledgerRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('ledgerEntries');

    // Manual revenue: ledgerEntries/account=revenue, type=credit
    const manualRevenueSnapshot = await ledgerRef.where('account', '==', 'revenue').get();
    manualRevenueSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.type !== 'credit') return;
      const dateMs = toMillis(data.date);
      if (!inRange(dateMs)) return;
      revenue += data.amount || 0;
    });

    // Manual expenses: ledgerEntries/account=expenses, type=debit
    let expenses = 0;
    const expensesSnapshot = await ledgerRef.where('account', '==', 'expenses').get();
    expensesSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.type !== 'debit') return;
      const dateMs = toMillis(data.date);
      if (!inRange(dateMs)) return;
      expenses += data.amount || 0;
    });

    // Stripe refunds: collectionGroup('refunds') filtered in memory.
    // Requires collection group index on refunds.businessId - wraps in try/catch if index missing
    let refunds = 0;
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
        refunds += data.amount || 0;
      });
    } catch (refundsErr) {
      console.warn('[pnl-report] Skipping refunds collectionGroup query (index may be missing):', (refundsErr as Error)?.message);
    }

    // Manual refunds (if any)
    const manualRefundsSnapshot = await ledgerRef.where('account', '==', 'refunds').get();
    manualRefundsSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.type !== 'debit') return;
      const dateMs = toMillis(data.date);
      if (!inRange(dateMs)) return;
      refunds += data.amount || 0;
    });

    // Stripe Connect commissions: commissions collection filtered by createdAt in memory.
    let commissionExpenses = 0;
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
      commissionExpenses += data.amount || 0;
    });

    expenses += commissionExpenses;

    // Calculate profit
    const grossProfit = revenue - refunds;
    const netProfit = grossProfit - expenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return NextResponse.json({
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      revenue,
      refunds,
      grossProfit,
      expenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
    });
  } catch (error) {
    console.error('[pnl-report] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate P&L report: ${errorMessage}` },
      { status: 500 }
    );
  }
}

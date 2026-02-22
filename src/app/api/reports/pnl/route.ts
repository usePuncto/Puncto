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
    const end = endDate ? Timestamp.fromDate(new Date(endDate)) : null;

    // Get revenue from payments
    const paymentsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('payments');

    let paymentsQuery = paymentsRef.where('status', '==', 'succeeded');
    if (start && end) {
      paymentsQuery = paymentsQuery
        .where('succeededAt', '>=', start)
        .where('succeededAt', '<=', end) as any;
    }

    const paymentsSnapshot = await paymentsQuery.get();
    let revenue = 0;
    paymentsSnapshot.forEach((doc) => {
      const data = doc.data();
      revenue += data.amount || 0;
    });

    // Get expenses from ledger entries
    const ledgerRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('ledgerEntries');

    let expensesQuery = ledgerRef
      .where('account', 'in', ['expenses', 'commission_expense', 'refunds'])
      .where('type', '==', 'debit');

    if (start && end) {
      expensesQuery = expensesQuery
        .where('date', '>=', start)
        .where('date', '<=', end) as any;
    }

    const expensesSnapshot = await expensesQuery.get();
    let expenses = 0;
    expensesSnapshot.forEach((doc) => {
      const data = doc.data();
      expenses += data.amount || 0;
    });

    // Get refunds separately
    let refundsQuery = ledgerRef
      .where('account', '==', 'refunds')
      .where('type', '==', 'debit');

    if (start && end) {
      refundsQuery = refundsQuery
        .where('date', '>=', start)
        .where('date', '<=', end) as any;
    }

    const refundsSnapshot = await refundsQuery.get();
    let refunds = 0;
    refundsSnapshot.forEach((doc) => {
      const data = doc.data();
      refunds += data.amount || 0;
    });

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

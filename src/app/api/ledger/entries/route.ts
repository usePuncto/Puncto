import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { LedgerAccount, EntryType } from '@/types/ledger';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - List ledger entries (manual occurrences) for a business
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const ledgerRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('ledgerEntries');

    const [expensesSnap, revenueSnap] = await Promise.all([
      ledgerRef.where('account', '==', 'expenses').get(),
      ledgerRef.where('account', '==', 'revenue').get(),
    ]);

    const toMillis = (value: any): number | null => {
      if (!value) return null;
      if (typeof value?.toMillis === 'function') return value.toMillis();
      if (value instanceof Date) return value.getTime();
      return null;
    };

    const startMs = startDate ? new Date(startDate).getTime() : null;
    const endMs = endDate ? new Date(endDate + 'T23:59:59.999').getTime() : null;

    const inRange = (millis: number | null) => {
      if (millis === null) return false;
      if (startMs !== null && millis < startMs) return false;
      if (endMs !== null && millis > endMs) return false;
      return true;
    };

    const entries: Array<{
      id: string;
      type: 'expense' | 'revenue';
      account: string;
      amount: number;
      description: string;
      date: string;
      createdAt: string;
      referenceType?: string;
      editable: boolean;
    }> = [];

    const addEntry = (doc: { id: string; data: () => Record<string, unknown> }) => {
      const data = doc.data() as any;
      const dateMs = toMillis(data.date);
      if (!inRange(dateMs)) return;
      const referenceType = data.referenceType as string | undefined;
      const editable = !referenceType || referenceType === 'manual' || referenceType === 'expense';
      entries.push({
        id: doc.id,
        type: data.account === 'expenses' ? 'expense' : 'revenue',
        account: data.account,
        amount: data.amount || 0,
        description: data.description || '',
        date: dateMs ? new Date(dateMs).toISOString().split('T')[0] : '',
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || '',
        referenceType,
        editable,
      });
    };

    expensesSnap.forEach(addEntry);
    revenueSnap.forEach(addEntry);

    entries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('[ledger GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}

// POST - Create a new ledger entry (financial occurrence)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, entry } = body;

    if (!businessId || !entry) {
      return NextResponse.json(
        { error: 'businessId and entry are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    if (!entry.account || !entry.type || entry.amount === undefined || !entry.description) {
      return NextResponse.json(
        { error: 'account, type, amount, and description are required' },
        { status: 400 }
      );
    }

    const validAccounts: LedgerAccount[] = ['expenses', 'revenue', 'cash', 'bank', 'other'];
    if (!validAccounts.includes(entry.account)) {
      return NextResponse.json(
        { error: 'Invalid account. Use: expenses, revenue, cash, bank, other' },
        { status: 400 }
      );
    }

    const validTypes: EntryType[] = ['debit', 'credit'];
    if (!validTypes.includes(entry.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Use: debit or credit' },
        { status: 400 }
      );
    }

    const ledgerRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('ledgerEntries');

    const amount = Math.round((entry.amount || 0) * 100);
    const date = entry.date ? new Date(entry.date) : new Date();

    const entryData = {
      businessId,
      date: Timestamp.fromDate(date),
      account: entry.account,
      type: entry.type,
      amount,
      currency: entry.currency || 'BRL',
      description: entry.description.trim(),
      referenceType: 'manual',
      createdAt: Timestamp.now(),
      createdBy: authResult.actor.uid,
      metadata: entry.metadata || {},
    };

    const docRef = await ledgerRef.add(entryData);

    return NextResponse.json({
      id: docRef.id,
      ...entryData,
    });
  } catch (error) {
    console.error('[ledger POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create ledger entry' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { LedgerAccount, EntryType } from '@/types/ledger';

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

    const amount = Math.round((entry.amount || 0) * 100); // Convert to cents
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
      createdBy: entry.createdBy || 'user',
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

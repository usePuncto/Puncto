import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { LedgerAccount, EntryType } from '@/types/ledger';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

function isEditableManualEntry(data: Record<string, unknown>) {
  const referenceType = data.referenceType;
  return !referenceType || referenceType === 'manual' || referenceType === 'expense';
}

// PUT - Update a ledger entry (manual occurrence)
export async function PUT(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
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

    const entryRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('ledgerEntries')
      .doc(params.entryId);

    const existing = await entryRef.get();
    if (!existing.exists) {
      return NextResponse.json(
        { error: 'Ocorrência não encontrada' },
        { status: 404 }
      );
    }

    const existingData = existing.data() || {};
    if (!isEditableManualEntry(existingData)) {
      return NextResponse.json(
        { error: 'Só é possível editar ocorrências manuais' },
        { status: 403 }
      );
    }

    const amount = Math.round((entry.amount || 0) * 100);
    const date = entry.date ? new Date(entry.date) : new Date();

    await entryRef.update({
      account: entry.account,
      type: entry.type,
      amount,
      description: entry.description.trim(),
      date: Timestamp.fromDate(date),
      updatedAt: Timestamp.now(),
    });

    const updated = await entryRef.get();
    return NextResponse.json({
      id: updated.id,
      ...updated.data(),
    });
  } catch (error) {
    console.error('[ledger entryId PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update ledger entry' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a ledger entry (manual occurrence)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

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

    const entryRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('ledgerEntries')
      .doc(params.entryId);

    const existing = await entryRef.get();
    if (!existing.exists) {
      return NextResponse.json(
        { error: 'Ocorrência não encontrada' },
        { status: 404 }
      );
    }

    const existingData = existing.data() || {};
    if (!isEditableManualEntry(existingData)) {
      return NextResponse.json(
        { error: 'Só é possível excluir ocorrências manuais' },
        { status: 403 }
      );
    }

    await entryRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ledger entryId DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete ledger entry' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, transactions, format = 'csv' } = body;

    if (!businessId || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, transactions' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const transactionsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('bankTransactions');

    const importedTransactions = [];

    for (const tx of transactions) {
      const transactionData = {
        businessId,
        bankName: tx.bankName || '',
        accountNumber: tx.accountNumber || '',
        transactionDate: tx.transactionDate 
          ? Timestamp.fromDate(new Date(tx.transactionDate))
          : Timestamp.now(),
        description: tx.description || '',
        amount: tx.amount || 0, // Positive for credit, negative for debit
        currency: tx.currency || 'BRL',
        balance: tx.balance || null,
        reference: tx.reference || null,
        reconciled: false,
        importedAt: Timestamp.now(),
        importedFrom: format,
      };

      const docRef = await transactionsRef.add(transactionData);
      importedTransactions.push({ id: docRef.id, ...transactionData });
    }

    return NextResponse.json({
      count: importedTransactions.length,
      transactions: importedTransactions,
    });
  } catch (error) {
    console.error('[reconciliation-import] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to import transactions: ${errorMessage}` },
      { status: 500 }
    );
  }
}

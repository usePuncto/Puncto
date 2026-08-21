import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageFiscalNotes,
  requireFiscalNotesAuth,
  serializeTimestamp,
} from '@/lib/fiscal-notes/auth';
import type { FiscalNoteStatus, FiscalNoteType } from '@/types/fiscalNote';

export const dynamic = 'force-dynamic';

const VALID_TYPES: FiscalNoteType[] = ['nfse', 'nfce', 'nfe', 'cfe', 'other'];
const VALID_STATUS: FiscalNoteStatus[] = ['stored', 'pending', 'cancelled', 'archived'];

function mapNote(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    type: data.type as string,
    number: String(data.number || ''),
    series: data.series ?? null,
    accessKey: data.accessKey ?? null,
    customerName: data.customerName ?? null,
    customerDocument: data.customerDocument ?? null,
    description: data.description ?? null,
    amount: Number(data.amount) || 0,
    status: data.status as string,
    issueDate: serializeTimestamp(data.issueDate) || data.issueDate || null,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    externalUrl: data.externalUrl ?? null,
    pdfDownloadUrl: data.pdfDownloadUrl ?? null,
    xmlDownloadUrl: data.xmlDownloadUrl ?? null,
    pdfFileName: data.pdfFileName ?? null,
    xmlFileName: data.xmlFileName ?? null,
  };
}

/**
 * GET /api/fiscal-notes?businessId=&month=&type=&status=&q=
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const businessId = sp.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireFiscalNotesAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const month = sp.get('month'); // YYYY-MM
    const type = sp.get('type') as FiscalNoteType | null;
    const status = sp.get('status') as FiscalNoteStatus | null;
    const q = (sp.get('q') || '').trim().toLowerCase();
    const limit = Math.min(parseInt(sp.get('limit') || '100', 10), 300);

    const ref = db.collection('businesses').doc(businessId).collection('fiscalNotes');
    let snapshot;
    try {
      snapshot = await ref.orderBy('issueDate', 'desc').limit(limit).get();
    } catch {
      snapshot = await ref.limit(limit).get();
    }

    let notes = snapshot.docs.map((d) => mapNote(d.id, d.data()));

    if (month) {
      notes = notes.filter((n) => {
        const iso = String(n.issueDate || '');
        return iso.startsWith(month);
      });
    }
    if (type && VALID_TYPES.includes(type)) {
      notes = notes.filter((n) => n.type === type);
    }
    if (status && VALID_STATUS.includes(status)) {
      notes = notes.filter((n) => n.status === status);
    }
    if (q) {
      notes = notes.filter((n) => {
        const hay = [
          n.number,
          n.series,
          n.accessKey,
          n.customerName,
          n.customerDocument,
          n.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const totalAmount = notes.reduce((s, n) => s + (Number(n.amount) || 0), 0);

    return NextResponse.json({
      notes,
      totals: {
        count: notes.length,
        amount: totalAmount,
      },
    });
  } catch (error) {
    console.error('[fiscal-notes GET]', error);
    return NextResponse.json({ error: 'Failed to list fiscal notes' }, { status: 500 });
  }
}

/**
 * POST /api/fiscal-notes — register a note (management, not emission)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      type,
      number,
      series,
      accessKey,
      issueDate,
      customerName,
      customerDocument,
      amount,
      status,
      description,
      externalUrl,
      relatedOrderId,
      relatedBookingId,
    } = body as Record<string, unknown>;

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type as FiscalNoteType)) {
      return NextResponse.json({ error: 'type inválido' }, { status: 400 });
    }
    if (!number || typeof number !== 'string') {
      return NextResponse.json({ error: 'number is required' }, { status: 400 });
    }
    if (!issueDate || typeof issueDate !== 'string') {
      return NextResponse.json({ error: 'issueDate is required' }, { status: 400 });
    }
    if (amount == null || Number.isNaN(Number(amount))) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 });
    }

    const authResult = await requireFiscalNotesAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageFiscalNotes(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const noteStatus =
      status && VALID_STATUS.includes(status as FiscalNoteStatus)
        ? (status as FiscalNoteStatus)
        : 'stored';

    const data = {
      businessId,
      type,
      number: String(number).trim(),
      series: series ? String(series).trim() : null,
      accessKey: accessKey ? String(accessKey).replace(/\D/g, '') : null,
      issueDate: new Date(issueDate),
      customerName: customerName ? String(customerName) : null,
      customerDocument: customerDocument
        ? String(customerDocument).replace(/\D/g, '')
        : null,
      amount: Number(amount),
      status: noteStatus,
      description: description ? String(description) : null,
      externalUrl: externalUrl ? String(externalUrl) : null,
      xmlStoragePath: null,
      xmlDownloadUrl: null,
      pdfStoragePath: null,
      pdfDownloadUrl: null,
      xmlFileName: null,
      pdfFileName: null,
      relatedOrderId: relatedOrderId ? String(relatedOrderId) : null,
      relatedBookingId: relatedBookingId ? String(relatedBookingId) : null,
      createdAt: now,
      updatedAt: now,
      createdBy: authResult.actor.uid,
      retentionYears: 5,
      /** Explicit: Puncto stores/manages — does not issue SEFAZ documents */
      managedOnly: true,
    };

    const ref = await db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalNotes')
      .add(data);

    return NextResponse.json({
      id: ref.id,
      ...data,
      issueDate: data.issueDate.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[fiscal-notes POST]', error);
    return NextResponse.json({ error: 'Failed to create fiscal note' }, { status: 500 });
  }
}

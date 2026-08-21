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

type Ctx = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = params;
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireFiscalNotesAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const snap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalNotes')
      .doc(id)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    }

    const data = snap.data()!;
    return NextResponse.json({
      id: snap.id,
      ...data,
      issueDate: serializeTimestamp(data.issueDate) || data.issueDate,
      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
    });
  } catch (error) {
    console.error('[fiscal-notes GET id]', error);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = params;
    const body = await request.json();
    const businessId = body.businessId as string | undefined;
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireFiscalNotesAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageFiscalNotes(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ref = db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalNotes')
      .doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const allowed = [
      'type',
      'number',
      'series',
      'accessKey',
      'issueDate',
      'customerName',
      'customerDocument',
      'amount',
      'status',
      'description',
      'externalUrl',
      'relatedOrderId',
      'relatedBookingId',
    ] as const;

    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === 'type' && !VALID_TYPES.includes(body.type)) continue;
      if (key === 'status' && !VALID_STATUS.includes(body.status)) continue;
      if (key === 'issueDate') {
        updates.issueDate = new Date(body.issueDate);
        continue;
      }
      if (key === 'amount') {
        updates.amount = Number(body.amount);
        continue;
      }
      if (key === 'accessKey' || key === 'customerDocument') {
        updates[key] = body[key] ? String(body[key]).replace(/\D/g, '') : null;
        continue;
      }
      updates[key] = body[key] === '' || body[key] == null ? null : body[key];
    }

    await ref.update(updates);
    const next = await ref.get();
    const data = next.data()!;
    return NextResponse.json({
      id,
      ...data,
      issueDate: serializeTimestamp(data.issueDate),
      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
    });
  } catch (error) {
    console.error('[fiscal-notes PATCH]', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = params;
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireFiscalNotesAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageFiscalNotes(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ref = db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalNotes')
      .doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[fiscal-notes DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}

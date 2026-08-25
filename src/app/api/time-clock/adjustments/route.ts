import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
  serializeTimestamp,
} from '@/lib/time-clock/auth';
import { getBrazilianLegalTime, retentionUntilFrom } from '@/lib/time-clock/legal-time';
import { onlyDigits } from '@/lib/time-clock/fiscal-utils';
import { assertRepPReady, resolveRepPEmployee } from '@/lib/time-clock/rep-employee';

export const dynamic = 'force-dynamic';

/**
 * Treatment adjustments (PTRP) — parallel to ARP/AFD. Never mutate original fiscal events.
 *
 * POST /api/time-clock/adjustments
 * GET  /api/time-clock/adjustments?businessId=
 *
 * manual_insert requires: markAt, reason (motivo), never creates ARP type-7 original.
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('timeClockAdjustments')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get()
      .catch(async () => {
        const all = await db
          .collection('businesses')
          .doc(businessId)
          .collection('timeClockAdjustments')
          .get();
        return {
          docs: all.docs.sort((a, b) => {
            const ta = a.data().createdAt?.toMillis?.() || 0;
            const tb = b.data().createdAt?.toMillis?.() || 0;
            return tb - ta;
          }),
        };
      });

    return NextResponse.json({
      adjustments: snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: serializeTimestamp(data.date),
          markAt: serializeTimestamp(data.markAt),
          createdAt: serializeTimestamp(data.createdAt),
        };
      }),
    });
  } catch (error) {
    console.error('[time-clock adjustments GET]', error);
    return NextResponse.json({ error: 'Failed to list adjustments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      userId,
      kind,
      date,
      markAt,
      markType,
      minutes,
      notes,
      reason,
      relatedNsr,
      relatedClockInId,
      employeeCpf,
      disregardNsr,
    } = body as {
      businessId?: string;
      userId?: string;
      kind?: string;
      date?: string;
      markAt?: string;
      markType?: 'E' | 'S' | 'D' | 'in' | 'out' | 'break_start' | 'break_end';
      minutes?: number;
      notes?: string;
      reason?: string;
      relatedNsr?: number;
      relatedClockInId?: string;
      employeeCpf?: string;
      disregardNsr?: number;
    };

    if (!businessId || !userId || !kind || !date) {
      return NextResponse.json(
        { error: 'businessId, userId, kind and date are required' },
        { status: 400 }
      );
    }

    const allowed = [
      'absence',
      'medical',
      'time_bank',
      'manual_insert',
      'disregard',
      'dsr',
      'holiday_comp',
      'other',
    ];
    if (!allowed.includes(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const motivo = (reason || notes || '').trim();
    if (kind === 'manual_insert' || kind === 'disregard') {
      if (!motivo) {
        return NextResponse.json(
          { error: 'Motivo obrigatório para inclusão manual ou desconsideração' },
          { status: 400 }
        );
      }
    }
    if (kind === 'manual_insert' && !markAt) {
      return NextResponse.json(
        { error: 'markAt (horário incluído) é obrigatório para inclusão manual' },
        { status: 400 }
      );
    }

    // Never mutate originals
    if (relatedClockInId) {
      const original = await db
        .collection('businesses')
        .doc(businessId)
        .collection('clockIns')
        .doc(relatedClockInId)
        .get();
      if (original.exists && original.data()?.immutable) {
        // reference only
      }
    }

    const legal = await getBrazilianLegalTime();
    const adjDate = new Date(date);
    const includedAt = markAt ? new Date(markAt) : null;
    const retentionUntil = retentionUntilFrom(legal.date);

    let employee = await resolveRepPEmployee(businessId, userId);
    let cpf = onlyDigits(employeeCpf || employee.cpf || '');
    if (kind === 'manual_insert') {
      employee = await assertRepPReady(businessId, userId);
      cpf = employee.cpf!;
    }

    const ref = await db
      .collection('businesses')
      .doc(businessId)
      .collection('timeClockAdjustments')
      .add({
        businessId,
        userId,
        employeeCpf: cpf || null,
        employeeName: employee.name,
        kind,
        date: adjDate,
        markAt: includedAt,
        markType: markType || null,
        minutes: minutes ?? null,
        notes: notes || null,
        reason: motivo || null,
        relatedNsr: relatedNsr ?? disregardNsr ?? null,
        relatedClockInId: relatedClockInId || null,
        /** AEJ fonteMarc = I for manual_insert */
        origin: kind === 'manual_insert' ? 'manual_insert' : kind,
        fonteMarc: kind === 'manual_insert' ? 'I' : kind === 'disregard' ? 'O' : null,
        tpMarc: kind === 'disregard' ? 'D' : null,
        createdAt: legal.date,
        createdBy: authResult.actor.uid,
        createdByEmail: authResult.actor.email || null,
        retentionUntil,
        retentionYears: 5,
        parallelToAfd: true,
        auditTrail: {
          action: 'ptrp_adjustment',
          actorUid: authResult.actor.uid,
          at: legal.date.toISOString(),
          reason: motivo || null,
        },
      });

    // Audit log (append-only admin ops)
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('timeClockAuditLog')
      .add({
        type: 'adjustment',
        adjustmentId: ref.id,
        userId,
        kind,
        actorUid: authResult.actor.uid,
        reason: motivo || null,
        createdAt: legal.date,
      });

    return NextResponse.json({
      id: ref.id,
      kind,
      date: adjDate.toISOString(),
      markAt: includedAt?.toISOString() || null,
      origin: kind === 'manual_insert' ? 'manual_insert' : kind,
      message:
        'Ajuste registrado no módulo de tratamento (PTRP/AEJ). O registro original da ARP/AFD permanece imutável.',
    });
  } catch (error) {
    console.error('[time-clock adjustments POST]', error);
    const message = error instanceof Error ? error.message : 'Failed to create adjustment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

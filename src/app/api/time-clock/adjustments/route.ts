import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
  serializeTimestamp,
} from '@/lib/time-clock/auth';
import { getBrazilianLegalTime, retentionUntilFrom } from '@/lib/time-clock/legal-time';
import { onlyDigits } from '@/lib/time-clock/fiscal-utils';

export const dynamic = 'force-dynamic';

/**
 * Treatment adjustments — parallel to AFD. Never mutate original clockIns.
 *
 * POST /api/time-clock/adjustments
 * GET  /api/time-clock/adjustments?businessId=
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
      minutes,
      notes,
      relatedNsr,
      relatedClockInId,
      employeeCpf,
    } = body as {
      businessId?: string;
      userId?: string;
      kind?: string;
      date?: string;
      minutes?: number;
      notes?: string;
      relatedNsr?: number;
      relatedClockInId?: string;
      employeeCpf?: string;
    };

    if (!businessId || !userId || !kind || !date) {
      return NextResponse.json(
        { error: 'businessId, userId, kind and date are required' },
        { status: 400 }
      );
    }

    const allowed = ['absence', 'medical', 'time_bank', 'manual_insert', 'other'];
    if (!allowed.includes(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Guard: never allow calling this endpoint to mutate clockIns
    if (relatedClockInId) {
      const original = await db
        .collection('businesses')
        .doc(businessId)
        .collection('clockIns')
        .doc(relatedClockInId)
        .get();
      if (original.exists && original.data()?.immutable) {
        // reference only — do not update original
      }
    }

    const legal = await getBrazilianLegalTime();
    const adjDate = new Date(date);
    const retentionUntil = retentionUntilFrom(legal.date);

    let cpf = onlyDigits(employeeCpf || '');
    if (!cpf) {
      const staff = await db
        .collection('businesses')
        .doc(businessId)
        .collection('staff')
        .doc(userId)
        .get();
      cpf = onlyDigits(staff.data()?.cpf || '');
    }

    const ref = await db
      .collection('businesses')
      .doc(businessId)
      .collection('timeClockAdjustments')
      .add({
        businessId,
        userId,
        employeeCpf: cpf || null,
        kind,
        date: adjDate,
        minutes: minutes ?? null,
        notes: notes || null,
        relatedNsr: relatedNsr ?? null,
        relatedClockInId: relatedClockInId || null,
        createdAt: legal.date,
        createdBy: authResult.actor.uid,
        retentionUntil,
        retentionYears: 5,
        /** Explicit: this never overwrites AFD */
        parallelToAfd: true,
      });

    return NextResponse.json({
      id: ref.id,
      kind,
      date: adjDate.toISOString(),
      message:
        'Ajuste registrado no módulo de tratamento (AEJ). O registro original do AFD permanece imutável.',
    });
  } catch (error) {
    console.error('[time-clock adjustments POST]', error);
    return NextResponse.json({ error: 'Failed to create adjustment' }, { status: 500 });
  }
}

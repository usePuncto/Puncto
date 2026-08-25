import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
  serializeTimestamp,
} from '@/lib/time-clock/auth';
import { getBrazilianLegalTime } from '@/lib/time-clock/legal-time';

export const dynamic = 'force-dynamic';

export type ContractualScheduleBody = {
  businessId: string;
  userId?: string;
  code: string;
  label?: string;
  /** pairs: [{ entrada: "0800"|"08:00", saida: "1200" }, ...] */
  pairs: Array<{ entrada: string; saida: string }>;
  durJornadaMinutes: number;
  validFrom: string;
  validTo?: string | null;
  active?: boolean;
};

/**
 * Contractual work schedule (horário contratual) — NOT auto-fill of punches.
 * Used for jornada calc, atrasos, HE, espelho, AEJ tipo 04.
 *
 * GET  /api/time-clock/contractual-schedules?businessId=&userId=
 * POST /api/time-clock/contractual-schedules
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    const userId = request.nextUrl.searchParams.get('userId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    let query: FirebaseFirestore.Query = db
      .collection('businesses')
      .doc(businessId)
      .collection('contractualSchedules')
      .where('active', '==', true);

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snap = await query.get().catch(async () => {
      const all = await db
        .collection('businesses')
        .doc(businessId)
        .collection('contractualSchedules')
        .get();
      return {
        docs: all.docs.filter((d) => {
          const data = d.data();
          if (data.active === false) return false;
          if (userId && data.userId !== userId && data.userId != null) return false;
          return true;
        }),
      };
    });

    return NextResponse.json({
      schedules: snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          validFrom: serializeTimestamp(data.validFrom),
          validTo: serializeTimestamp(data.validTo),
          createdAt: serializeTimestamp(data.createdAt),
        };
      }),
      note: 'Horário contratual não gera batidas automáticas (noContractualAutoFill).',
    });
  } catch (error) {
    console.error('[contractual-schedules GET]', error);
    return NextResponse.json({ error: 'Failed to list schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ContractualScheduleBody>;
    const { businessId, userId, code, label, pairs, durJornadaMinutes, validFrom, validTo } =
      body;

    if (!businessId || !code || !pairs?.length || !durJornadaMinutes || !validFrom) {
      return NextResponse.json(
        {
          error:
            'businessId, code, pairs[], durJornadaMinutes and validFrom are required',
        },
        { status: 400 }
      );
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const legal = await getBrazilianLegalTime();
    const col = db
      .collection('businesses')
      .doc(businessId)
      .collection('contractualSchedules');

    // Close previous active schedule with same code/user (history)
    const prev = await col
      .where('code', '==', code)
      .where('active', '==', true)
      .get()
      .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] }));

    const batch = db.batch();
    for (const doc of prev.docs) {
      if (userId && doc.data().userId && doc.data().userId !== userId) continue;
      batch.update(doc.ref, {
        active: false,
        validTo: new Date(validFrom),
        supersededAt: legal.date,
        supersededBy: authResult.actor.uid,
      });
    }

    const ref = col.doc();
    batch.set(ref, {
      businessId,
      userId: userId || null,
      code,
      label: label || code,
      pairs,
      durJornadaMinutes,
      validFrom: new Date(validFrom),
      validTo: validTo ? new Date(validTo) : null,
      active: body.active !== false,
      createdAt: legal.date,
      createdBy: authResult.actor.uid,
      /** Explicit: never used to auto-create punches */
      doesNotAutoFillMarks: true,
    });

    await batch.commit();

    return NextResponse.json({
      id: ref.id,
      code,
      message: 'Horário contratual cadastrado (histórico preservado).',
    });
  } catch (error) {
    console.error('[contractual-schedules POST]', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}

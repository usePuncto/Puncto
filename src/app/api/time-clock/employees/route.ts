import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';
import {
  resolveRepPEmployee,
  upsertRepPEmployee,
} from '@/lib/time-clock/rep-employee';
import { isUsableRepPCpf } from '@/lib/time-clock/cpf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/employees?businessId=&userId=
 * Lists REP-P readiness (cpf, blockers, esocialRegistration).
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
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (userId) {
      const status = await resolveRepPEmployee(businessId, userId);
      return NextResponse.json({ employee: status });
    }

    const staffSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('staff')
      .get();

    const employees = await Promise.all(
      staffSnap.docs.map((d) => resolveRepPEmployee(businessId, d.id))
    );

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('[time-clock employees GET]', error);
    return NextResponse.json({ error: 'Failed to list employees' }, { status: 500 });
  }
}

/**
 * POST /api/time-clock/employees
 * Body: { businessId, userId, cpf?, name?, esocialRegistration?, repPEnabled? }
 * Validates CPF before enabling REP-P; emits ARP type-5.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      userId,
      cpf,
      name,
      esocialRegistration,
      repPEnabled,
      actorCpf,
    } = body as {
      businessId?: string;
      userId?: string;
      cpf?: string;
      name?: string;
      esocialRegistration?: string | null;
      repPEnabled?: boolean;
      actorCpf?: string;
    };

    if (!businessId || !userId) {
      return NextResponse.json(
        { error: 'businessId and userId are required' },
        { status: 400 }
      );
    }

    if (cpf !== undefined && cpf !== '' && !isUsableRepPCpf(cpf)) {
      return NextResponse.json(
        { error: 'CPF inválido', blockers: ['cpf_invalido'] },
        { status: 400 }
      );
    }

    if (repPEnabled === true) {
      const checkCpf = cpf;
      if (checkCpf !== undefined && !isUsableRepPCpf(checkCpf)) {
        return NextResponse.json(
          {
            error: 'Não é possível habilitar REP-P sem CPF válido',
            blockers: ['cpf_ausente', 'cpf_invalido'],
          },
          { status: 400 }
        );
      }
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = await upsertRepPEmployee({
      businessId,
      business: authResult.business,
      userId,
      actorUid: authResult.actor.uid,
      actorCpf,
      cpf,
      name,
      esocialRegistration,
      employmentRelationshipId: (body as { employmentRelationshipId?: string })
        .employmentRelationshipId,
      repPEnabled,
    });

    return NextResponse.json({ employee: status });
  } catch (error) {
    console.error('[time-clock employees POST]', error);
    const message = error instanceof Error ? error.message : 'Failed to update employee';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

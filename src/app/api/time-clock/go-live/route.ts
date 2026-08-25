import { NextRequest, NextResponse } from 'next/server';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';
import { resolveRepEstablishment } from '@/lib/time-clock/establishment';
import { getRepPGoLiveAt, setRepPGoLiveAt } from '@/lib/time-clock/arp';
import { getBrazilianLegalTime } from '@/lib/time-clock/legal-time';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/time-clock/go-live
 * Sets or reads repPGoLiveAt per fiscal establishment (CNPJ/CPF).
 *
 * Transition policy:
 * - Before go-live: no REP-P fiscal marks; clockIns may exist as non-fiscal UX history.
 * - At/after go-live: all original marks must go through ARP; AFD reads only ARP.
 * - Periods entirely before go-live cannot be exported as AFD REP-P.
 */
export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId');
  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 });
  }
  const authResult = await requireTimeClockAuth(request, businessId);
  if ('error' in authResult) return authResult.error;
  if (!canManageTimeClock(authResult.actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const establishment = resolveRepEstablishment(authResult.business);
  const goLive = await getRepPGoLiveAt(businessId, establishment.repEstablishmentId);
  return NextResponse.json({
    repEstablishmentId: establishment.repEstablishmentId,
    taxId: establishment.taxId,
    repPGoLiveAt: goLive?.toISOString() || null,
    transitionPolicy: {
      afdSource: 'repFiscalEvents_only',
      noLegacyClockInsFallback: true,
      preGoLiveData: 'system_history_non_fiscal',
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { businessId, goLiveAt } = body as { businessId?: string; goLiveAt?: string };
  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 });
  }

  const authResult = await requireTimeClockAuth(request, businessId);
  if ('error' in authResult) return authResult.error;
  if (!canManageTimeClock(authResult.actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const establishment = resolveRepEstablishment(authResult.business);
  const existing = await getRepPGoLiveAt(businessId, establishment.repEstablishmentId);
  if (existing) {
    return NextResponse.json(
      {
        error: 'repPGoLiveAt já definido e não pode ser alterado retroativamente por esta API',
        repPGoLiveAt: existing.toISOString(),
      },
      { status: 409 }
    );
  }

  const legal = await getBrazilianLegalTime();
  const at = goLiveAt ? new Date(goLiveAt) : legal.date;
  if (Number.isNaN(at.getTime())) {
    return NextResponse.json({ error: 'goLiveAt inválido' }, { status: 400 });
  }

  await setRepPGoLiveAt(businessId, establishment, at, authResult.actor.uid);
  return NextResponse.json({
    ok: true,
    repEstablishmentId: establishment.repEstablishmentId,
    repPGoLiveAt: at.toISOString(),
    message:
      'REP-P ativado. A partir desta data, marcações originais entram na ARP e o AFD não inclui histórico pré-go-live.',
  });
}

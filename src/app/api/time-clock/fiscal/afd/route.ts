import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';
import {
  buildAfd,
  AFD_LAYOUT_VERSION,
  type AfdMarkRow,
  type AfdEmployerChangeRow,
  type AfdClockAdjustRow,
  type AfdEmployeeChangeRow,
  type AfdSensitiveRow,
} from '@/lib/time-clock/afd';
import { listFiscalEventsInPeriod, getRepPGoLiveAt } from '@/lib/time-clock/arp';
import { resolveRepEstablishment } from '@/lib/time-clock/establishment';
import { getBrazilianLegalTime, retentionUntilFrom } from '@/lib/time-clock/legal-time';
import { signAfdCades } from '@/lib/time-clock/signing';

export const dynamic = 'force-dynamic';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * GET /api/time-clock/fiscal/afd?businessId=&from=&to=&format=json|txt|p7s
 * AFD 004 exclusively from ARP (repFiscalEvents). No clockIns legacy fallback.
 *
 * Transition: periods before repPGoLiveAt are rejected with a clear message —
 * pre-go-live data remains non-fiscal system history only.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const businessId = sp.get('businessId');
    const from = sp.get('from');
    const to = sp.get('to');

    if (!businessId || !from || !to) {
      return NextResponse.json(
        { error: 'businessId, from and to (YYYY-MM-DD) are required' },
        { status: 400 }
      );
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { business } = authResult;
    let establishment;
    try {
      establishment = resolveRepEstablishment(business);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Estabelecimento inválido' },
        { status: 400 }
      );
    }

    const goLive = await getRepPGoLiveAt(businessId, establishment.repEstablishmentId);
    if (!goLive) {
      return NextResponse.json(
        {
          error:
            'REP-P não iniciado para este estabelecimento. Defina repPGoLiveAt antes de gerar AFD fiscal.',
          code: 'REP_P_NOT_LIVE',
          repEstablishmentId: establishment.repEstablishmentId,
        },
        { status: 422 }
      );
    }

    const periodStart = new Date(`${from}T00:00:00-03:00`);
    const periodEnd = new Date(`${to}T23:59:59-03:00`);

    if (periodEnd < goLive) {
      return NextResponse.json(
        {
          error:
            'O período solicitado é anterior ao início oficial do REP-P neste estabelecimento. Dados anteriores não são registros fiscais REP-P e não entram no AFD.',
          code: 'PERIOD_BEFORE_REP_P_GO_LIVE',
          repPGoLiveAt: goLive.toISOString(),
          repEstablishmentId: establishment.repEstablishmentId,
          requestedFrom: from,
          requestedTo: to,
        },
        { status: 422 }
      );
    }

    // Clamp export start to go-live (partial overlap allowed)
    const effectiveStart = periodStart < goLive ? goLive : periodStart;
    const legal = await getBrazilianLegalTime();

    const events = await listFiscalEventsInPeriod(
      businessId,
      establishment.repEstablishmentId,
      effectiveStart,
      periodEnd
    );

    const employerChanges: AfdEmployerChangeRow[] = [];
    const clockAdjusts: AfdClockAdjustRow[] = [];
    const employeeChanges: AfdEmployeeChangeRow[] = [];
    const sensitiveEvents: AfdSensitiveRow[] = [];
    const marks: AfdMarkRow[] = [];

    for (const ev of events) {
      const p = ev.payload;
      if (ev.recordType === '2') {
        employerChanges.push({
          nsr: ev.nsr,
          recordedAt: ev.recordedAt,
          responsibleCpf: String(p.responsibleCpf || ''),
          employerTaxId: String(p.employerTaxId || establishment.taxId),
          cnoOrCaepf: String(p.cnoOrCaepf || ''),
          legalName: String(p.legalName || business.legalName || business.displayName),
          serviceLocation: String(p.serviceLocation || ''),
        });
      } else if (ev.recordType === '4') {
        clockAdjusts.push({
          nsr: ev.nsr,
          beforeAt: toDate(p.beforeAt) || ev.recordedAt,
          afterAt: toDate(p.afterAt) || ev.recordedAt,
          responsibleCpf: String(p.responsibleCpf || ''),
        });
      } else if (ev.recordType === '5') {
        employeeChanges.push({
          nsr: ev.nsr,
          recordedAt: ev.recordedAt,
          operation: (p.operation as 'I' | 'A' | 'E') || 'A',
          employeeCpf: String(p.employeeCpf || ''),
          employeeName: String(p.employeeName || ''),
          otherId: String(p.otherId || ''),
          responsibleCpf: String(p.responsibleCpf || ''),
        });
      } else if (ev.recordType === '6') {
        sensitiveEvents.push({
          nsr: ev.nsr,
          recordedAt: ev.recordedAt,
          eventCode: String(p.eventCode || '07'),
        });
      } else if (ev.recordType === '7') {
        const markAt = toDate(p.markAt) || ev.recordedAt;
        marks.push({
          nsr: ev.nsr,
          markAt,
          recordedAt: ev.recordedAt,
          employeeCpf: String(p.employeeCpf || ''),
          collectorId: String(p.collectorId || '02'),
          offline: Boolean(p.offline),
          hash: ev.afdHash || undefined,
        });
      }
    }

    const afd = buildAfd({
      employerTaxId: establishment.taxId,
      employerLegalName: business.legalName || business.displayName,
      periodStart: effectiveStart,
      periodEnd,
      generatedAt: legal.date,
      employerChanges,
      clockAdjusts,
      employeeChanges,
      sensitiveEvents,
      marks,
    });

    const signature = signAfdCades(afd.content);
    const retentionUntil = retentionUntilFrom(legal.date);

    const exportRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalExports')
      .add({
        type: 'AFD',
        layoutVersion: AFD_LAYOUT_VERSION,
        fileName: afd.fileName,
        repEstablishmentId: establishment.repEstablishmentId,
        periodStart: from,
        periodEnd: to,
        effectivePeriodStart: effectiveStart.toISOString(),
        repPGoLiveAt: goLive.toISOString(),
        markCount: afd.markCount,
        counts: afd.counts,
        sha256File: afd.sha256File,
        signatureStatus: signature.status,
        signatureStandard: signature.standard,
        signatureReason: signature.reason || null,
        contentLatin1Base64: Buffer.from(afd.content, 'latin1').toString('base64'),
        p7sBase64: signature.p7s ? signature.p7s.toString('base64') : null,
        retentionUntil,
        retentionYears: 5,
        generatedAt: legal.date,
        generatedBy: authResult.actor.uid,
        generationMode: 'on_demand_immediate',
        source: 'repFiscalEvents_only',
      });

    const format = sp.get('format') || 'json';
    if (format === 'txt') {
      return new NextResponse(afd.content, {
        headers: {
          'Content-Type': 'text/plain; charset=ISO-8859-1',
          'Content-Disposition': `attachment; filename="${afd.fileName}"`,
          'X-AFD-SHA256': afd.sha256File,
          'X-AFD-Layout': AFD_LAYOUT_VERSION,
          'X-Signature-Status': signature.status,
          'X-Export-Id': exportRef.id,
        },
      });
    }

    if (format === 'p7s') {
      if (!signature.p7s) {
        return NextResponse.json(
          { error: signature.reason || 'Assinatura ICP-Brasil não disponível' },
          { status: 422 }
        );
      }
      return new NextResponse(new Uint8Array(signature.p7s), {
        headers: {
          'Content-Type': 'application/pkcs7-signature',
          'Content-Disposition': `attachment; filename="${afd.fileName}.p7s"`,
          'X-Export-Id': exportRef.id,
        },
      });
    }

    return NextResponse.json({
      exportId: exportRef.id,
      fileName: afd.fileName,
      layoutVersion: AFD_LAYOUT_VERSION,
      repEstablishmentId: establishment.repEstablishmentId,
      repPGoLiveAt: goLive.toISOString(),
      effectivePeriodStart: effectiveStart.toISOString(),
      markCount: afd.markCount,
      counts: afd.counts,
      sha256File: afd.sha256File,
      signature: {
        status: signature.status,
        standard: signature.standard,
        reason: signature.reason,
        signerSubject: signature.signerSubject,
      },
      retentionUntil: retentionUntil.toISOString(),
      downloadTxt: `/api/time-clock/fiscal/afd?businessId=${businessId}&from=${from}&to=${to}&format=txt`,
      downloadP7s: `/api/time-clock/fiscal/afd?businessId=${businessId}&from=${from}&to=${to}&format=p7s`,
      contentBase64: Buffer.from(afd.content, 'latin1').toString('base64'),
      source: 'repFiscalEvents_only',
      note: 'AFD gerado exclusivamente da ARP. Sem fallback de clockIns legados.',
    });
  } catch (error) {
    console.error('[time-clock AFD] Error:', error);
    return NextResponse.json({ error: 'Failed to export AFD' }, { status: 500 });
  }
}

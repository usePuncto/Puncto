import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';
import { buildAfd, type AfdMarkRow } from '@/lib/time-clock/afd';
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
 * GET /api/time-clock/fiscal/afd?businessId=&from=&to=
 * Exports immutable AFD + optional .p7s (vendor ICP-Brasil).
 * Stores export metadata for 5-year retention/traceability.
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
    const periodStart = new Date(`${from}T00:00:00-03:00`);
    const periodEnd = new Date(`${to}T23:59:59-03:00`);
    const legal = await getBrazilianLegalTime();

    const snap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('clockIns')
      .where('timestamp', '>=', periodStart)
      .where('timestamp', '<=', periodEnd)
      .orderBy('timestamp', 'asc')
      .get()
      .catch(async () => {
        const all = await db
          .collection('businesses')
          .doc(businessId)
          .collection('clockIns')
          .orderBy('nsr', 'asc')
          .get();
        return {
          docs: all.docs.filter((d) => {
            const t = toDate(d.data().timestamp);
            return t && t >= periodStart && t <= periodEnd;
          }),
        };
      });

    const marks: AfdMarkRow[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const markAt = toDate(data.timestamp);
      if (!markAt || !data.nsr) continue;
      marks.push({
        nsr: Number(data.nsr),
        markAt,
        recordedAt: toDate(data.createdAt) || markAt,
        employeeCpf: String(data.employeeCpf || '0'),
        collectorId: String(data.collectorId || '02'),
        offline: Boolean(data.offline),
        hash: data.afdHash as string | undefined,
      });
    }
    marks.sort((a, b) => a.nsr - b.nsr);

    const afd = buildAfd({
      employerTaxId: business.taxId || '',
      employerLegalName: business.legalName || business.displayName,
      periodStart,
      periodEnd,
      generatedAt: legal.date,
      marks,
    });

    // CAdES detached (.p7s) — always Puncto vendor ICP-Brasil
    const signature = signAfdCades(afd.content);
    const retentionUntil = retentionUntilFrom(legal.date);

    const exportRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalExports')
      .add({
        type: 'AFD',
        fileName: afd.fileName,
        periodStart: from,
        periodEnd: to,
        markCount: afd.markCount,
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
      });

    const format = sp.get('format') || 'json';
    if (format === 'txt') {
      return new NextResponse(afd.content, {
        headers: {
          'Content-Type': 'text/plain; charset=ISO-8859-1',
          'Content-Disposition': `attachment; filename="${afd.fileName}"`,
          'X-AFD-SHA256': afd.sha256File,
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
      markCount: afd.markCount,
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
    });
  } catch (error) {
    console.error('[time-clock AFD] Error:', error);
    return NextResponse.json({ error: 'Failed to export AFD' }, { status: 500 });
  }
}

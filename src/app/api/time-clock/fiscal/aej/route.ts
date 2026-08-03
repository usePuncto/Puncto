import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';
import {
  buildAej,
  clockTypeToAej,
  type AejAdjustmentRow,
  type AejMarkRow,
} from '@/lib/time-clock/aej';
import { getBrazilianLegalTime, retentionUntilFrom } from '@/lib/time-clock/legal-time';
import { signAejCades } from '@/lib/time-clock/signing';

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
 * GET /api/time-clock/fiscal/aej?businessId=&from=&to=
 * AEJ consolidates AFD marks + parallel treatment adjustments.
 * Signed by employer ICP-Brasil (not software vendor).
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

    const [marksSnap, adjSnap] = await Promise.all([
      db
        .collection('businesses')
        .doc(businessId)
        .collection('clockIns')
        .orderBy('nsr', 'asc')
        .get()
        .catch(() =>
          db.collection('businesses').doc(businessId).collection('clockIns').get()
        ),
      db
        .collection('businesses')
        .doc(businessId)
        .collection('timeClockAdjustments')
        .get(),
    ]);

    const marks: AejMarkRow[] = [];
    for (const doc of marksSnap.docs) {
      const data = doc.data();
      const markAt = toDate(data.timestamp);
      if (!markAt || markAt < periodStart || markAt > periodEnd) continue;
      marks.push({
        nsr: Number(data.nsr || 0),
        employeeCpf: String(data.employeeCpf || '0'),
        markAt,
        markType: clockTypeToAej(String(data.type)),
        sourceNsr: Number(data.nsr || 0),
        treated: false,
      });
    }

    const adjustments: AejAdjustmentRow[] = [];
    for (const doc of adjSnap.docs) {
      const data = doc.data();
      const date = toDate(data.date) || toDate(data.createdAt);
      if (!date || date < periodStart || date > periodEnd) continue;
      adjustments.push({
        employeeCpf: String(data.employeeCpf || '0'),
        date,
        kind: String(data.kind || 'other'),
        minutes: data.minutes != null ? Number(data.minutes) : undefined,
        notes: data.notes as string | undefined,
        relatedNsr: data.relatedNsr != null ? Number(data.relatedNsr) : undefined,
      });
    }

    const aej = buildAej({
      employerTaxId: business.taxId || '',
      employerLegalName: business.legalName || business.displayName,
      periodStart,
      periodEnd,
      generatedAt: legal.date,
      marks,
      adjustments,
    });

    // CAdES detached (.p7s) — employer e-CNPJ from uploaded PFX (never Puncto vendor)
    const signature = await signAejCades(businessId, aej.content);
    const retentionUntil = retentionUntilFrom(legal.date);

    const exportRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalExports')
      .add({
        type: 'AEJ',
        fileName: aej.fileName,
        periodStart: from,
        periodEnd: to,
        markCount: marks.length,
        adjustmentCount: adjustments.length,
        sha256File: aej.sha256File,
        signatureStatus: signature.status,
        signatureStandard: signature.standard,
        signatureReason: signature.reason || null,
        signerSubject: signature.signerSubject || null,
        employerCertCN: signature.employerMeta?.subjectCN || null,
        contentLatin1Base64: Buffer.from(aej.content, 'latin1').toString('base64'),
        p7sBase64: signature.p7s ? signature.p7s.toString('base64') : null,
        retentionUntil,
        retentionYears: 5,
        generatedAt: legal.date,
        generatedBy: authResult.actor.uid,
        signedByRole: 'employer',
      });

    const format = sp.get('format') || 'json';
    if (format === 'txt') {
      return new NextResponse(aej.content, {
        headers: {
          'Content-Type': 'text/plain; charset=ISO-8859-1',
          'Content-Disposition': `attachment; filename="${aej.fileName}"`,
          'X-AEJ-SHA256': aej.sha256File,
          'X-Signature-Status': signature.status,
          'X-Export-Id': exportRef.id,
        },
      });
    }

    if (format === 'p7s') {
      if (!signature.p7s) {
        return NextResponse.json(
          { error: signature.reason || 'Assinatura do empregador não disponível' },
          { status: 422 }
        );
      }
      return new NextResponse(new Uint8Array(signature.p7s), {
        headers: {
          'Content-Type': 'application/pkcs7-signature',
          'Content-Disposition': `attachment; filename="${aej.fileName}.p7s"`,
          'X-Export-Id': exportRef.id,
        },
      });
    }

    return NextResponse.json({
      exportId: exportRef.id,
      fileName: aej.fileName,
      markCount: marks.length,
      adjustmentCount: adjustments.length,
      sha256File: aej.sha256File,
      signature: {
        status: signature.status,
        standard: signature.standard,
        reason: signature.reason,
        signerSubject: signature.signerSubject,
        employerCertCN: signature.employerMeta?.subjectCN || null,
      },
      retentionUntil: retentionUntil.toISOString(),
      downloadTxt: `/api/time-clock/fiscal/aej?businessId=${businessId}&from=${from}&to=${to}&format=txt`,
      downloadP7s: `/api/time-clock/fiscal/aej?businessId=${businessId}&from=${from}&to=${to}&format=p7s`,
      contentBase64: Buffer.from(aej.content, 'latin1').toString('base64'),
    });
  } catch (error) {
    console.error('[time-clock AEJ] Error:', error);
    return NextResponse.json({ error: 'Failed to export AEJ' }, { status: 500 });
  }
}

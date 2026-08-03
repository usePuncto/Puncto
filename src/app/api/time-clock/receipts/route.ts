import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/receipts?businessId=&clockInId=
 * Employee may download own comprovante; managers may download any.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const businessId = sp.get('businessId');
    const clockInId = sp.get('clockInId');

    if (!businessId || !clockInId) {
      return NextResponse.json(
        { error: 'businessId and clockInId are required' },
        { status: 400 }
      );
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const receiptSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('clockReceipts')
      .doc(clockInId)
      .get();

    if (!receiptSnap.exists) {
      return NextResponse.json({ error: 'Comprovante não encontrado' }, { status: 404 });
    }

    const receipt = receiptSnap.data()!;
    if (
      receipt.userId !== authResult.actor.uid &&
      !canManageTimeClock(authResult.actor)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const format = sp.get('format') || 'pdf';

    if (format === 'meta') {
      return NextResponse.json({
        clockInId,
        nsr: receipt.nsr,
        fileName: receipt.fileName,
        sha256: receipt.sha256,
        signatureStatus: receipt.signatureStatus,
        signatureStandard: receipt.signatureStandard,
        signatureReason: receipt.signatureReason,
        signerSubject: receipt.signerSubject || null,
        padesEmbedded: Boolean(receipt.padesEmbedded),
        availableUntil: receipt.availableUntil?.toDate?.()?.toISOString?.() || receipt.availableUntil,
        retentionUntil: receipt.retentionUntil?.toDate?.()?.toISOString?.() || receipt.retentionUntil,
      });
    }

    // Legacy: separate .p7s only if ever stored (PAdES is embedded in PDF)
    if (format === 'p7s') {
      return NextResponse.json(
        {
          error:
            'O comprovante usa PAdES embutido no PDF. Baixe format=pdf — a assinatura ICP-Brasil da Puncto já está no arquivo.',
        },
        { status: 422 }
      );
    }

    const pdf = Buffer.from(receipt.pdfBase64, 'base64');
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${receipt.fileName}"`,
        'X-Receipt-SHA256': String(receipt.sha256 || ''),
        'X-Signature-Status': String(receipt.signatureStatus || ''),
      },
    });
  } catch (error) {
    console.error('[time-clock receipts] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}

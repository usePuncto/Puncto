import { NextRequest, NextResponse } from 'next/server';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';
import {
  deleteEmployerCertificate,
  getEmployerCertMeta,
  saveEmployerCertificate,
} from '@/lib/time-clock/employer-cert';
import { hasSecretsKey } from '@/lib/crypto/secrets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/time-clock/employer-certificate?businessId=
 * Public metadata only (never returns PFX or password).
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

    const meta = await getEmployerCertMeta(businessId);
    return NextResponse.json({
      ...meta,
      encryptionConfigured: hasSecretsKey(),
    });
  } catch (error) {
    console.error('[employer-certificate GET]', error);
    return NextResponse.json({ error: 'Failed to load certificate meta' }, { status: 500 });
  }
}

/**
 * POST /api/time-clock/employer-certificate
 * multipart: businessId, password, file (.pfx)
 * or JSON: businessId, password, pfxBase64
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let businessId: string | undefined;
    let password: string | undefined;
    let pfxBuffer: Buffer | undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      businessId = String(form.get('businessId') || '');
      password = String(form.get('password') || '');
      const file = form.get('file');
      if (file && typeof file !== 'string') {
        const ab = await file.arrayBuffer();
        pfxBuffer = Buffer.from(ab);
      }
    } else {
      const body = await request.json();
      businessId = body.businessId;
      password = body.password;
      if (body.pfxBase64) {
        pfxBuffer = Buffer.from(body.pfxBase64, 'base64');
      }
    }

    if (!businessId || !password || !pfxBuffer?.length) {
      return NextResponse.json(
        { error: 'businessId, password e arquivo .pfx são obrigatórios' },
        { status: 400 }
      );
    }

    if (pfxBuffer.length > 2_000_000) {
      return NextResponse.json({ error: 'Arquivo .pfx muito grande' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const meta = await saveEmployerCertificate({
      businessId,
      pfxBuffer,
      password,
      uploadedBy: authResult.actor.uid,
    });

    return NextResponse.json({
      ok: true,
      message:
        'Certificado e-CNPJ do empregador armazenado com senha criptografada. Será usado na assinatura CAdES do AEJ.',
      certificate: meta,
    });
  } catch (error) {
    console.error('[employer-certificate POST]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao salvar certificado (verifique senha do .pfx)',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    await deleteEmployerCertificate(businessId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[employer-certificate DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete certificate' }, { status: 500 });
  }
}

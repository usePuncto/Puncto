import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GONE = {
  error:
    'Certificado do empregador não é mais utilizado. O AEJ é assinado com o certificado ICP-Brasil da Puncto (desenvolvedora do PTRP). Remova qualquer PFX enviado anteriormente.',
  aejSignedBy: 'puncto_ptrp_developer',
};

/**
 * Employer PFX upload removed — AEJ uses Puncto vendor certificate.
 */
export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json(GONE, { status: 410 });
}

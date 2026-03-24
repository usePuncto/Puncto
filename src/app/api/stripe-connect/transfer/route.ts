import { NextResponse } from 'next/server';

/**
 * Commission payouts via Stripe Connect transfers are intentionally disabled.
 * Connect is used at business level for receiving payments, not for automatic per-professional splits.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Repasse automático de comissões via Stripe está desativado. As comissões ficam apenas registradas no Puncto.',
      transfersDisabled: true,
    },
    { status: 410 }
  );
}

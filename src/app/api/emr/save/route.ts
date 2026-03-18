// Deprecated legacy route for signed EMRs (kept for backward compatibility only).
// New flows use /api/emr/draft and /api/emr/complete.
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/emr/draft and /api/emr/complete instead.' },
    { status: 410 }
  );
}

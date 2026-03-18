import { NextRequest, NextResponse } from 'next/server';

/**
 * Sets the business slug cookie so the tenant layout can identify the business.
 * Called before redirecting to /tenant/admin/dashboard after onboarding.
 * This bypasses the need for middleware to set headers when the matcher doesn't run.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = body?.businessId;

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('x-business-slug', businessId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

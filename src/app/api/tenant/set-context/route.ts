import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import type { CustomClaims } from '@/types/user';
import { hasBusinessAccess, isPlatformAdmin } from '@/lib/auth/middleware-utils';
import { authCookieBaseOptions, BUSINESS_SLUG_COOKIE } from '@/lib/auth/session-cookie';

/**
 * Sets the business slug cookie so the tenant layout can identify the business.
 * Requires auth; caller must have access to the business (or be platform admin).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('__session')?.value;

    let decoded: {
      uid: string;
      userType?: string;
      platformAdmin?: boolean;
      businessRoles?: Record<string, string>;
      primaryBusinessId?: string;
    } | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        decoded = await auth.verifyIdToken(authHeader.slice('Bearer '.length));
      } catch {
        decoded = null;
      }
    } else if (sessionCookie) {
      try {
        decoded = await auth.verifySessionCookie(sessionCookie, true);
      } catch {
        decoded = null;
      }
    }

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const businessId = body?.businessId;

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    const claims = {
      userType: decoded.userType,
      platformAdmin: decoded.platformAdmin,
      businessRoles: decoded.businessRoles,
      primaryBusinessId: decoded.primaryBusinessId,
    } as CustomClaims;

    const allowed =
      isPlatformAdmin(claims) ||
      hasBusinessAccess(claims, businessId) ||
      decoded.primaryBusinessId === businessId;

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      BUSINESS_SLUG_COOKIE,
      businessId,
      authCookieBaseOptions(60 * 60)
    );

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

/**
 * GET /api/auth/verify-session
 * Node runtime: verify __session with Admin SDK (Edge jose often fails on session cookies).
 * Used by middleware as fallback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import type { CustomClaims, UserType } from '@/types/user';

export const runtime = 'nodejs';

function toClaims(decoded: Record<string, unknown>): CustomClaims | null {
  let userType = decoded.userType as UserType | undefined;
  if (!userType && decoded.platformAdmin === true) userType = 'platform_admin';
  if (
    !userType &&
    decoded.businessRoles &&
    typeof decoded.businessRoles === 'object' &&
    Object.keys(decoded.businessRoles as object).length > 0
  ) {
    userType = 'business_user';
  }
  if (!userType) return null;

  return {
    userType,
    platformAdmin: decoded.platformAdmin as boolean | undefined,
    platformRole: decoded.platformRole as CustomClaims['platformRole'],
    businessRoles: decoded.businessRoles as CustomClaims['businessRoles'],
    primaryBusinessId: decoded.primaryBusinessId as string | undefined,
    customerId: decoded.customerId as string | undefined,
    studentBusinessId: decoded.studentBusinessId as string | undefined,
    studentCustomerId: decoded.studentCustomerId as string | undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (request.headers.get('x-middleware-verify') !== '1') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const claims = toClaims(decoded as unknown as Record<string, unknown>);
    if (!claims) {
      return NextResponse.json({ error: 'No usable claims' }, { status: 401 });
    }

    return NextResponse.json(claims);
  } catch (error: unknown) {
    console.error('[Auth verify-session]', error);
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}

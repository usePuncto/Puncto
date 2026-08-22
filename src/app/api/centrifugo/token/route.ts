import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { auth } from '@/lib/firebaseAdmin';

function signJWT(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');
  return `${header}.${payloadEncoded}.${signature}`;
}

const centrifugoSecret = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET?.trim() || '';

/**
 * Org channels are granted only from verified Firebase custom claims
 * (businessRoles / primaryBusinessId / studentBusinessId) — never from the
 * editable Firestore users/{uid} document.
 */
function resolveAuthorizedOrgIds(decodedToken: {
  uid: string;
  userType?: string;
  businessRoles?: Record<string, string>;
  primaryBusinessId?: string;
  studentBusinessId?: string;
  orgId?: string;
}): string[] {
  const ids = new Set<string>();

  const roles = decodedToken.businessRoles;
  if (roles && typeof roles === 'object') {
    for (const [businessId, role] of Object.entries(roles)) {
      if (
        businessId &&
        (role === 'owner' || role === 'manager' || role === 'professional')
      ) {
        ids.add(businessId);
      }
    }
  }

  if (
    decodedToken.userType === 'business_user' &&
    decodedToken.primaryBusinessId &&
    roles?.[decodedToken.primaryBusinessId]
  ) {
    ids.add(decodedToken.primaryBusinessId);
  }

  if (decodedToken.userType === 'student' && decodedToken.studentBusinessId) {
    ids.add(decodedToken.studentBusinessId);
  }

  // Legacy claim orgId only if it matches an already-authorized business
  if (decodedToken.orgId && ids.has(decodedToken.orgId)) {
    ids.add(decodedToken.orgId);
  }

  return Array.from(ids);
}

/**
 * Generate Centrifugo JWT token for authenticated user
 * POST /api/centrifugo/token
 */
export async function POST(request: NextRequest) {
  try {
    if (!centrifugoSecret || centrifugoSecret.length < 16) {
      return NextResponse.json(
        { error: 'Realtime token service is not configured' },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const orgIds = resolveAuthorizedOrgIds(
      decodedToken as {
        uid: string;
        userType?: string;
        businessRoles?: Record<string, string>;
        primaryBusinessId?: string;
        studentBusinessId?: string;
        orgId?: string;
      }
    );

    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      sub: decodedToken.uid,
      exp: now + 3600,
    };

    if (orgIds.length > 0) {
      const channels: string[] = [];
      for (const orgId of orgIds) {
        channels.push(
          `org:${orgId}:bookings`,
          `org:${orgId}:orders`,
          `org:${orgId}:kitchen`,
          `org:${orgId}:timeclock`,
          `org:${orgId}:inventory`
        );
      }
      payload.channels = channels;
    }

    const token = signJWT(payload, centrifugoSecret);

    return NextResponse.json({ token });
  } catch (error: unknown) {
    console.error('[Centrifugo Token] Error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}

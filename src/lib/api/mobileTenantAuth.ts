import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { auth } from '@/lib/firebaseAdmin';

type BusinessRoles = Record<string, 'owner' | 'manager' | 'professional'> | undefined;

function rolesFromDecoded(decoded: DecodedIdToken): BusinessRoles {
  return (decoded as unknown as { businessRoles?: BusinessRoles }).businessRoles;
}

function userTypeFromDecoded(decoded: DecodedIdToken): string | undefined {
  return (decoded as unknown as { userType?: string }).userType;
}

function primaryBusinessFromDecoded(decoded: DecodedIdToken): string | undefined {
  return (decoded as unknown as { primaryBusinessId?: string }).primaryBusinessId;
}

/**
 * Resolve tenant business id for a business staff JWT.
 * Honors `businessId` query when the user has a role in that business.
 */
export function resolveMobileTenantBusinessId(
  decoded: DecodedIdToken,
  businessIdParam: string | null
): string | null {
  const roles = rolesFromDecoded(decoded);
  if (!roles || Object.keys(roles).length === 0) return null;

  if (businessIdParam && roles[businessIdParam]) return businessIdParam;

  const primary = primaryBusinessFromDecoded(decoded);
  if (primary && roles[primary]) return primary;

  const first = Object.keys(roles)[0];
  return first ?? null;
}

export type MobileTenantAuthOk = {
  uid: string;
  decoded: DecodedIdToken;
  businessId: string;
};

export type MobileTenantAuthFail = { response: NextResponse };

/**
 * Verifies Firebase ID token (Authorization: Bearer) and tenant access.
 */
export async function requireMobileTenantAuth(
  request: NextRequest
): Promise<MobileTenantAuthOk | MobileTenantAuthFail> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { response: NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 }) };
  }

  const raw = authHeader.slice('Bearer '.length).trim();
  if (!raw) {
    return { response: NextResponse.json({ error: 'Missing token' }, { status: 401 }) };
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await auth.verifyIdToken(raw, true);
  } catch {
    return { response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  if (userTypeFromDecoded(decoded) !== 'business_user') {
    return { response: NextResponse.json({ error: 'Tenant app requires business_user' }, { status: 403 }) };
  }

  const businessIdParam = request.nextUrl.searchParams.get('businessId');
  const businessId = resolveMobileTenantBusinessId(decoded, businessIdParam);
  if (!businessId) {
    return { response: NextResponse.json({ error: 'No business access on this account' }, { status: 403 }) };
  }

  return { uid: decoded.uid, decoded, businessId };
}

export async function getMobileBearerDecoded(request: NextRequest): Promise<DecodedIdToken | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const raw = authHeader.slice('Bearer '.length).trim();
  if (!raw) return null;
  try {
    return await auth.verifyIdToken(raw, true);
  } catch {
    return null;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getMobileBearerDecoded, resolveMobileTenantBusinessId } from '@/lib/api/mobileTenantAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mobile/admin/me
 * Session bootstrap for native admin: businesses visible to this user + default business id.
 */
export async function GET(request: NextRequest) {
  const decoded = await getMobileBearerDecoded(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if ((decoded as unknown as { userType?: string }).userType !== 'business_user') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const roles = (decoded as unknown as { businessRoles?: Record<string, string> }).businessRoles ?? {};
  const businessIds = Object.keys(roles);
  if (businessIds.length === 0) {
    return NextResponse.json({ error: 'No business roles' }, { status: 403 });
  }

  const businesses = await Promise.all(
    businessIds.map(async (id) => {
      const snap = await db.collection('businesses').doc(id).get();
      const d = snap.data();
      return {
        id,
        displayName: (d?.displayName as string) || id,
        role: roles[id] as 'owner' | 'manager' | 'professional',
      };
    })
  );

  const hint = request.nextUrl.searchParams.get('businessId');
  const currentBusinessId =
    resolveMobileTenantBusinessId(decoded, hint) ?? businessIds[0] ?? null;

  return NextResponse.json({
    uid: decoded.uid,
    email: decoded.email ?? null,
    businesses,
    currentBusinessId,
  });
}

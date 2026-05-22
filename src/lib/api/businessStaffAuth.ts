import { NextRequest } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

type StaffRole = 'owner' | 'manager' | 'professional';

function roleFromClaims(
  claims: Record<string, unknown>,
  businessId: string
): StaffRole | null {
  const roles = claims.businessRoles as Record<string, string> | undefined;
  const role = roles?.[businessId];
  if (role === 'owner' || role === 'manager' || role === 'professional') {
    return role;
  }
  return null;
}

function isPlatformAdminClaim(claims: Record<string, unknown>): boolean {
  if (claims.platformAdmin === true) return true;
  return claims.userType === 'platform_admin' && claims.platformAdmin === true;
}

/**
 * Verifies the caller may access APIs scoped to a business (owner, manager, professional, or platform admin).
 */
export async function verifyBusinessStaff(
  request: NextRequest,
  businessId: string
): Promise<{ uid: string; role: StaffRole | 'platform_admin' } | null> {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7).trim();
    if (!token) return null;

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;
    const claims = decoded as Record<string, unknown>;

    if (isPlatformAdminClaim(claims)) {
      return { uid, role: 'platform_admin' };
    }

    const claimRole = roleFromClaims(claims, businessId);
    if (claimRole) {
      return { uid, role: claimRole };
    }

    const staffSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('staff')
      .doc(uid)
      .get();

    if (staffSnap.exists) {
      const staff = staffSnap.data() as { role?: string; active?: boolean } | undefined;
      if (staff?.active === false) return null;
      const staffRole = staff?.role;
      if (staffRole === 'owner' || staffRole === 'manager' || staffRole === 'professional') {
        return { uid, role: staffRole };
      }
    }

    const businessSnap = await db.collection('businesses').doc(businessId).get();
    if (businessSnap.exists && businessSnap.data()?.createdBy === uid) {
      return { uid, role: 'owner' };
    }

    return null;
  } catch (err) {
    console.error('[verifyBusinessStaff]', err);
    return null;
  }
}

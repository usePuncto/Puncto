import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import type { Business } from '@/types/business';

export type BusinessActorRole = 'owner' | 'manager' | 'professional' | 'staff';

export type BusinessActor = {
  uid: string;
  email?: string;
  isPlatformAdmin: boolean;
  role: BusinessActorRole | null;
  /** Staff document permissions when loaded */
  permissions?: Record<string, boolean>;
  professionalId?: string;
};

export type RequireBusinessAuthOptions = {
  /** If set, actor must be platform admin or have one of these roles. */
  minRoles?: BusinessActorRole[];
  /**
   * If minRoles would deny, still allow when the staff doc has any of these
   * permission flags set to true (e.g. manageBookings).
   */
  anyPermission?: string[];
};

export type BusinessAuthOk = {
  actor: BusinessActor;
  business: Business;
};

export type BusinessAuthFail = {
  error: NextResponse;
};

function isFail(result: BusinessAuthOk | BusinessAuthFail): result is BusinessAuthFail {
  return 'error' in result;
}

/**
 * Verifies Firebase Bearer token and tenant membership for Admin SDK routes.
 * Resolves role from custom claims, then active staff doc.
 */
export async function requireBusinessAuth(
  request: NextRequest,
  businessId: string,
  options: RequireBusinessAuthOptions = {}
): Promise<BusinessAuthOk | BusinessAuthFail> {
  if (!businessId?.trim()) {
    return {
      error: NextResponse.json({ error: 'businessId is required' }, { status: 400 }),
    };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(authHeader.slice('Bearer '.length).trim());
  } catch {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists) {
    return {
      error: NextResponse.json({ error: 'Business not found' }, { status: 404 }),
    };
  }

  const business = { id: businessDoc.id, ...businessDoc.data() } as Business;
  const claims = decoded as {
    platformAdmin?: boolean;
    userType?: string;
    businessRoles?: Record<string, string>;
    professionalId?: string;
  };

  const isPlatformAdmin =
    claims.platformAdmin === true && claims.userType === 'platform_admin';

  const claimRole = claims.businessRoles?.[businessId] as BusinessActorRole | undefined;
  let role: BusinessActorRole | null = claimRole || null;
  let permissions: Record<string, boolean> | undefined;
  let professionalId =
    typeof claims.professionalId === 'string' ? claims.professionalId : undefined;

  const needsStaffDoc = !role || Boolean(options.anyPermission?.length) || !professionalId;
  if (!isPlatformAdmin && needsStaffDoc) {
    const staffSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('staff')
      .doc(decoded.uid)
      .get();
    if (staffSnap.exists && staffSnap.data()?.active !== false) {
      const staffData = staffSnap.data() as {
        role?: string;
        permissions?: Record<string, boolean>;
        professionalId?: string;
      };
      if (!role) {
        role = (staffData.role as BusinessActorRole) || 'staff';
      }
      permissions = staffData.permissions;
      if (!professionalId && typeof staffData.professionalId === 'string') {
        professionalId = staffData.professionalId;
      }
    }
  }

  if (!isPlatformAdmin && !role) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  const minRoles = options.minRoles;
  if (minRoles?.length && !isPlatformAdmin) {
    const hasRole = role != null && minRoles.includes(role);
    const hasPermission =
      options.anyPermission?.some((p) => permissions?.[p] === true) ?? false;
    if (!hasRole && !hasPermission) {
      return {
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }
  }

  return {
    actor: {
      uid: decoded.uid,
      email: decoded.email,
      isPlatformAdmin,
      role,
      permissions,
      professionalId,
    },
    business,
  };
}

export function canManageBusiness(actor: BusinessActor): boolean {
  return (
    actor.isPlatformAdmin ||
    actor.role === 'owner' ||
    actor.role === 'manager'
  );
}

export function authError(
  result: BusinessAuthOk | BusinessAuthFail
): result is BusinessAuthFail {
  return isFail(result);
}

/** Owner / manager (or platform admin) — money, settings, keys, webhooks. */
export const MANAGER_ROLES: BusinessActorRole[] = ['owner', 'manager'];

/** Common staff permission used for booking/payment ops. */
export const BOOKINGS_PERMISSION = ['manageBookings'] as const;

import { NextRequest } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { hasModuleAccess } from '@/lib/features/moduleAccess';
import type { Business } from '@/types/business';

export type TimeClockActor = {
  uid: string;
  email?: string;
  displayName?: string;
  isPlatformAdmin: boolean;
  role: 'owner' | 'manager' | 'professional' | 'staff' | null;
};

export async function requireTimeClockAuth(
  request: NextRequest,
  businessId: string
): Promise<{ actor: TimeClockActor; business: Business } | { error: Response }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return {
      error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists) {
    return {
      error: Response.json({ error: 'Business not found' }, { status: 404 }),
    };
  }

  const business = { id: businessDoc.id, ...businessDoc.data() } as Business;

  const claims = decoded as {
    platformAdmin?: boolean;
    businessRoles?: Record<string, string>;
  };
  const isPlatformAdmin = claims.platformAdmin === true;
  const claimRole = claims.businessRoles?.[businessId] as
    | 'owner'
    | 'manager'
    | 'professional'
    | undefined;

  let role: TimeClockActor['role'] = claimRole || null;
  if (!role && !isPlatformAdmin) {
    const staffSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('staff')
      .doc(decoded.uid)
      .get();
    if (staffSnap.exists && staffSnap.data()?.active !== false) {
      role = (staffSnap.data()?.role as TimeClockActor['role']) || 'staff';
    }
  }

  if (!isPlatformAdmin && !role) {
    return {
      error: Response.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  if (!isPlatformAdmin) {
    if (business.enabledModules) {
      if (!hasModuleAccess(business, 'ponto_eletronico')) {
        return {
          error: Response.json(
            { error: 'Módulo de ponto eletrônico não está disponível para este negócio' },
            { status: 403 }
          ),
        };
      }
    } else if (business.features?.timeClock === false) {
      return {
        error: Response.json(
          { error: 'Módulo de ponto eletrônico não está disponível para este negócio' },
          { status: 403 }
        ),
      };
    }
  }

  const userRecord = await auth.getUser(decoded.uid).catch(() => null);

  return {
    actor: {
      uid: decoded.uid,
      email: userRecord?.email || decoded.email,
      displayName: userRecord?.displayName || undefined,
      isPlatformAdmin,
      role,
    },
    business,
  };
}

export function canManageTimeClock(actor: TimeClockActor): boolean {
  return (
    actor.isPlatformAdmin ||
    actor.role === 'owner' ||
    actor.role === 'manager'
  );
}

export async function resolveStaffNames(
  businessId: string,
  userIds: string[]
): Promise<Record<string, { name: string; email?: string }>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const result: Record<string, { name: string; email?: string }> = {};

  await Promise.all(
    unique.map(async (uid) => {
      try {
        const [user, staff, pros] = await Promise.all([
          auth.getUser(uid).catch(() => null),
          db.collection('businesses').doc(businessId).collection('staff').doc(uid).get(),
          db
            .collection('businesses')
            .doc(businessId)
            .collection('professionals')
            .where('userId', '==', uid)
            .limit(1)
            .get(),
        ]);

        const proName = pros.empty ? null : (pros.docs[0].data()?.name as string | undefined);
        const staffName = staff.data()?.name as string | undefined;

        result[uid] = {
          name:
            proName ||
            staffName ||
            user?.displayName ||
            user?.email?.split('@')[0] ||
            uid.slice(0, 8),
          email: user?.email,
        };
      } catch {
        result[uid] = { name: uid.slice(0, 8) };
      }
    })
  );

  return result;
}

export function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

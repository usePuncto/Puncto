import { NextRequest } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { hasModuleAccess } from '@/lib/features/moduleAccess';
import type { Business } from '@/types/business';

export type FiscalNotesActor = {
  uid: string;
  email?: string;
  isPlatformAdmin: boolean;
  role: 'owner' | 'manager' | 'professional' | 'staff' | null;
};

export async function requireFiscalNotesAuth(
  request: NextRequest,
  businessId: string
): Promise<{ actor: FiscalNotesActor; business: Business } | { error: Response }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists) {
    return { error: Response.json({ error: 'Business not found' }, { status: 404 }) };
  }

  const business = { id: businessDoc.id, ...businessDoc.data() } as Business;
  const claims = decoded as {
    platformAdmin?: boolean;
    businessRoles?: Record<string, string>;
  };
  const isPlatformAdmin = claims.platformAdmin === true;
  const claimRole = claims.businessRoles?.[businessId] as FiscalNotesActor['role'] | undefined;

  let role: FiscalNotesActor['role'] = claimRole || null;
  if (!role && !isPlatformAdmin) {
    const staffSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('staff')
      .doc(decoded.uid)
      .get();
    if (staffSnap.exists && staffSnap.data()?.active !== false) {
      role = (staffSnap.data()?.role as FiscalNotesActor['role']) || 'staff';
    }
  }

  if (!isPlatformAdmin && !role) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  if (!isPlatformAdmin) {
    if (business.enabledModules) {
      if (!hasModuleAccess(business, 'emissao_nf')) {
        return {
          error: Response.json(
            { error: 'Módulo de gestão de notas fiscais não está disponível' },
            { status: 403 }
          ),
        };
      }
    } else if (business.features?.nfceGeneration === false) {
      return {
        error: Response.json(
          { error: 'Módulo de gestão de notas fiscais não está disponível' },
          { status: 403 }
        ),
      };
    }
  }

  return {
    actor: {
      uid: decoded.uid,
      email: decoded.email,
      isPlatformAdmin,
      role,
    },
    business,
  };
}

export function canManageFiscalNotes(actor: FiscalNotesActor): boolean {
  return (
    actor.isPlatformAdmin ||
    actor.role === 'owner' ||
    actor.role === 'manager'
  );
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

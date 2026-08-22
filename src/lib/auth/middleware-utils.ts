/**
 * Middleware utilities for JWT token validation and user type checking
 * Used in middleware.ts to enforce authentication domain separation
 */

import { NextRequest } from 'next/server';
import { CustomClaims, UserType } from '@/types/user';
import { verifyFirebaseJwtClaims } from '@/lib/auth/verifyFirebaseJwtEdge';

/**
 * Extract and cryptographically verify Firebase JWT from cookies.
 * Only trusts httpOnly `__session` (legacy cookie names are ignored).
 */
export async function getCustomClaimsFromRequest(
  request: NextRequest
): Promise<CustomClaims | null> {
  try {
    const token = request.cookies.get('__session')?.value;

    if (!token) {
      return null;
    }

    return await verifyFirebaseJwtClaims(token);
  } catch (error) {
    console.error('[Middleware] Error verifying custom claims:', error);
    return null;
  }
}

/**
 * Check if user has the required user type for the current route
 */
export function hasRequiredUserType(
  claims: CustomClaims | null,
  requiredType: UserType
): boolean {
  if (!claims) return false;
  return claims.userType === requiredType;
}

/**
 * Check if user is a platform admin
 */
export function isPlatformAdmin(claims: CustomClaims | null): boolean {
  if (!claims) return false;
  return claims.userType === 'platform_admin' && claims.platformAdmin === true;
}

/**
 * Check if user has access to a specific business
 *
 * @param businessHostLabel - Subdomínio do host (ex.: slug `minha-escola`) ou, em casos raros, o id Firestore.
 * @param resolvedFirestoreBusinessId - Quando o host é slug, id do negócio resolvido no Firestore (chaves de `businessRoles` costumam ser este id).
 */
export function hasBusinessAccess(
  claims: CustomClaims | null,
  businessHostLabel: string,
  resolvedFirestoreBusinessId?: string | null,
): boolean {
  if (!claims) return false;

  // Platform admins have access to all businesses
  if (isPlatformAdmin(claims)) return true;

  // Business users must have a role in the specific business
  if (claims.userType === 'business_user') {
    if (claims.businessRoles?.[businessHostLabel]) return true;
    if (resolvedFirestoreBusinessId && claims.businessRoles?.[resolvedFirestoreBusinessId]) return true;
    return false;
  }

  return false;
}

/**
 * Get the user's role in a specific business
 */
export function getBusinessRole(
  claims: CustomClaims | null,
  businessId: string
): 'owner' | 'manager' | 'professional' | null {
  if (!claims || claims.userType !== 'business_user') return null;
  return claims.businessRoles?.[businessId] || null;
}

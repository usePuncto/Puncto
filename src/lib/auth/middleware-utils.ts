/**
 * Middleware utilities for JWT token validation and user type checking
 * Used in middleware.ts to enforce authentication domain separation
 */

import { NextRequest } from 'next/server';
import { CustomClaims, UserType } from '@/types/user';

/**
 * Extract and decode the Firebase ID token from cookies
 * Returns the custom claims if valid, null otherwise
 */
export async function getCustomClaimsFromRequest(
  request: NextRequest
): Promise<CustomClaims | null> {
  try {
    // Try to get the ID token from various cookie locations
    const idToken =
      request.cookies.get('__session')?.value ||
      request.cookies.get('firebase-auth-token')?.value ||
      request.cookies.get('firebaseIdToken')?.value;

    if (!idToken) {
      return null;
    }

    // Decode the JWT (without verification for middleware performance)
    // Server-side API routes should verify the token properly
    const payload = parseJwt(idToken);

    if (!payload) {
      return null;
    }

    // Extract custom claims
    const customClaims: CustomClaims = {
      userType: payload.userType || 'customer', // Default to customer if not set
      platformAdmin: payload.platformAdmin,
      platformRole: payload.platformRole,
      businessRoles: payload.businessRoles,
      primaryBusinessId: payload.primaryBusinessId,
      customerId: payload.customerId,
      studentBusinessId: payload.studentBusinessId,
      studentCustomerId: payload.studentCustomerId,
    };

    return customClaims;
  } catch (error) {
    console.error('[Middleware] Error extracting custom claims:', error);
    return null;
  }
}

/**
 * Parse JWT without verification (middleware use only)
 * For full verification, use Firebase Admin SDK in API routes
 */
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
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
 */
export function hasBusinessAccess(
  claims: CustomClaims | null,
  businessId: string
): boolean {
  if (!claims) return false;

  // Platform admins have access to all businesses
  if (isPlatformAdmin(claims)) return true;

  // Business users must have a role in the specific business
  if (claims.userType === 'business_user') {
    return !!claims.businessRoles?.[businessId];
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

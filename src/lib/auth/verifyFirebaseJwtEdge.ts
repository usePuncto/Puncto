import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { CustomClaims, UserType } from '@/types/user';

const FIREBASE_ID_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

function getFirebaseProjectId(): string | null {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    null
  );
}

function claimsFromPayload(payload: JWTPayload): CustomClaims {
  return {
    userType: (payload.userType as UserType) || 'customer',
    platformAdmin: payload.platformAdmin as boolean | undefined,
    platformRole: payload.platformRole as CustomClaims['platformRole'],
    businessRoles: payload.businessRoles as CustomClaims['businessRoles'],
    primaryBusinessId: payload.primaryBusinessId as string | undefined,
    customerId: payload.customerId as string | undefined,
    studentBusinessId: payload.studentBusinessId as string | undefined,
    studentCustomerId: payload.studentCustomerId as string | undefined,
  };
}

/**
 * Cryptographically verify a Firebase ID token or session cookie JWT on the Edge.
 */
export async function verifyFirebaseJwtClaims(token: string): Promise<CustomClaims | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId || !token) return null;

  const issuers = [
    `https://securetoken.google.com/${projectId}`,
    `https://session.firebase.google.com/${projectId}`,
  ];

  for (const issuer of issuers) {
    try {
      const { payload } = await jwtVerify(token, FIREBASE_ID_JWKS, {
        issuer,
        audience: projectId,
      });
      if (!payload.sub) return null;
      return claimsFromPayload(payload);
    } catch {
      // try next issuer
    }
  }

  return null;
}

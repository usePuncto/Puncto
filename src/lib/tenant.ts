import { headers, cookies } from 'next/headers';
import { db } from './firebaseAdmin';
import { Business } from '@/types/business';

/**
 * Check if string looks like a Firestore document ID (20 chars, alphanumeric)
 */
function looksLikeDocId(value: string): boolean {
  return /^[a-zA-Z0-9]{19,21}$/.test(value);
}

/**
 * Get the current business based on subdomain
 * Server-side only - uses headers set by middleware
 * Supports both business slug and Firestore document ID (e.g. from onboarding redirect)
 */
export async function getCurrentBusiness(): Promise<Business | null> {
  const businessSlug = getBusinessSlug();

  if (!businessSlug) {
    return null;
  }

  try {
    // If it looks like a Firestore doc ID, fetch by ID (e.g. from /tenant?subdomain=xxx after onboarding)
    if (looksLikeDocId(businessSlug)) {
      const doc = await db.collection('businesses').doc(businessSlug).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as Business;
    }

    // Otherwise query by slug (production subdomain)
    const businessSnapshot = await db
      .collection('businesses')
      .where('slug', '==', businessSlug)
      .limit(1)
      .get();

    if (businessSnapshot.empty) {
      return null;
    }

    const doc = businessSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Business;
  } catch (error) {
    console.error('Error fetching business:', error);
    return null;
  }
}

/**
 * Get the business slug from middleware header or cookie
 * Server-side only
 */
export function getBusinessSlug(): string | null {
  try {
    // First try to get from header (set by middleware)
    const headersList = headers();
    const headerSlug = headersList.get('x-business-slug');
    if (headerSlug) return headerSlug;

    // Fallback to cookie (set by API or middleware)
    const cookieStore = cookies();
    const cookieSlug = cookieStore.get('x-business-slug')?.value;
    if (cookieSlug) return cookieSlug;

    return null;
  } catch {
    return null;
  }
}

/**
 * Serialize business for Client Components (converts Firestore Timestamps to ISO strings).
 * Server Components cannot pass class instances (e.g. Firestore Timestamp) to Client Components.
 */
export function serializeBusinessForClient<T extends object>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => {
      // Firestore Timestamp has toDate()
      if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate().toISOString();
      }
      return value;
    })
  ) as T;
}

/**
 * Check if current context is a tenant subdomain
 */
export function isTenantContext(): boolean {
  return getBusinessSlug() !== null;
}

/**
 * Check if current context is platform admin
 */
export function isPlatformAdmin(): boolean {
  const slug = getBusinessSlug();
  return slug === 'admin';
}

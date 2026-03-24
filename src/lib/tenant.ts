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
    console.log('[Tenant] getCurrentBusiness: no slug, returning null');
    return null;
  }

  try {
    // Slug first: many slugs are 19–21 alphanumeric chars and would falsely match looksLikeDocId
    console.log('[Tenant] getCurrentBusiness: lookup by slug:', businessSlug);
    const bySlug = await db
      .collection('businesses')
      .where('slug', '==', businessSlug)
      .limit(1)
      .get();

    if (!bySlug.empty) {
      const doc = bySlug.docs[0];
      console.log('[Tenant] getCurrentBusiness: found by slug:', doc.id);
      return { id: doc.id, ...doc.data() } as Business;
    }

    // Onboarding / redirects: subdomain may be Firestore doc ID before slug is used
    if (looksLikeDocId(businessSlug)) {
      console.log('[Tenant] getCurrentBusiness: lookup by doc ID:', businessSlug);
      const doc = await db.collection('businesses').doc(businessSlug).get();
      if (!doc.exists) {
        console.log('[Tenant] getCurrentBusiness: no business for slug or doc ID:', businessSlug);
        return null;
      }
      console.log('[Tenant] getCurrentBusiness: found by ID:', doc.id);
      return { id: doc.id, ...doc.data() } as Business;
    }

    console.log('[Tenant] getCurrentBusiness: no business found for slug:', businessSlug);
    return null;
  } catch (error) {
    console.error('[Tenant] getCurrentBusiness error:', error);
    return null;
  }
}

/**
 * Get the business slug from middleware header or cookie
 * Server-side only
 */
export function getBusinessSlug(): string | null {
  try {
    const headersList = headers();

    // First try x-business-slug (set by middleware on request or response)
    const headerSlug = headersList.get('x-business-slug');
    if (headerSlug) {
      console.log('[Tenant] getBusinessSlug: from x-business-slug header:', headerSlug);
      return headerSlug;
    }

    // Fallback: parse subdomain from request URL (middleware sets x-middleware-request-url)
    const requestUrl = headersList.get('x-middleware-request-url');
    if (requestUrl) {
      try {
        const url = new URL(requestUrl);
        const subdomain = url.searchParams.get('subdomain');
        if (subdomain) {
          console.log('[Tenant] getBusinessSlug: from x-middleware-request-url query:', subdomain);
          return subdomain;
        }
      } catch {
        // ignore URL parse errors
      }
    }

    // Fallback to cookie (set by API or middleware)
    const cookieStore = cookies();
    const cookieSlug = cookieStore.get('x-business-slug')?.value;
    if (cookieSlug) {
      console.log('[Tenant] getBusinessSlug: from cookie:', cookieSlug);
      return cookieSlug;
    }

    console.log('[Tenant] getBusinessSlug: null (no header, url, or cookie)');
    return null;
  } catch (err) {
    console.error('[Tenant] getBusinessSlug error:', err);
    return null;
  }
}

/**
 * Get business by slug (for path-based routes like /b/[slug] - dev/testing)
 */
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  try {
    const businessSnapshot = await db
      .collection('businesses')
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (businessSnapshot.empty) return null;
    const doc = businessSnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Business;
  } catch (error) {
    console.error('[Tenant] getBusinessBySlug error:', error);
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
  return slug === 'primazia';
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Business } from '@/types/business';
import { hasFeatureAccess } from '@/lib/features/businessTypeFeatures';
import { isSubscriptionAccessBlocked } from '@/lib/business/subscription-access';

/**
 * Verify that a business has access to a specific feature
 * Returns business data if access is granted, null otherwise
 */
export async function verifyBusinessFeatureAccess(
  businessId: string,
  featureKey: keyof Business['features']
): Promise<{ business: Business; hasAccess: boolean } | null> {
  try {
    const businessDoc = await db.collection('businesses').doc(businessId).get();

    if (!businessDoc.exists) {
      return null;
    }

    const data = businessDoc.data();
    if (data?.deletedAt || isSubscriptionAccessBlocked(data?.subscription?.status)) {
      return null;
    }

    const business = {
      id: businessDoc.id,
      ...data,
    } as Business;

    // Check feature access
    const hasAccess = hasFeatureAccess(business, featureKey);

    return {
      business,
      hasAccess,
    };
  } catch (error) {
    console.error('[Feature Validation] Error:', error);
    return null;
  }
}

/**
 * Middleware to protect API routes based on business feature access
 * Returns NextResponse with 403 if feature is not accessible
 */
export function withFeatureAccess<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  featureKey: keyof Business['features'],
  businessIdExtractor: (request: NextRequest) => string | null
) {
  return async (request: NextRequest, ...args: Parameters<T>): Promise<Response> => {
    const businessId = businessIdExtractor(request);

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify feature access
    const result = await verifyBusinessFeatureAccess(businessId, featureKey);

    if (!result) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!result.hasAccess) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          message: `This feature is not available for your business type (${result.business.industry}) or subscription tier (${result.business.subscription.tier})`,
        },
        { status: 403 }
      );
    }

    // Add business to request context
    (request as any).business = result.business;

    return handler(request, ...args);
  };
}

/**
 * Extract businessId from query params
 */
export function extractBusinessIdFromQuery(request: NextRequest): string | null {
  const searchParams = request.nextUrl.searchParams;
  return searchParams.get('businessId');
}

/**
 * Extract businessId from request body
 */
export async function extractBusinessIdFromBody(request: NextRequest): Promise<string | null> {
  try {
    const body = await request.json();
    return body.businessId || null;
  } catch {
    return null;
  }
}

/**
 * Extract businessId from URL path (e.g., /api/orders/[businessId])
 */
export function extractBusinessIdFromPath(
  request: NextRequest,
  pathPattern: string
): string | null {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const patternParts = pathPattern.split('/');

  const businessIdIndex = patternParts.indexOf('[businessId]');
  if (businessIdIndex >= 0 && pathParts[businessIdIndex]) {
    return pathParts[businessIdIndex];
  }

  return null;
}

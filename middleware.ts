import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {
  getCustomClaimsFromRequest,
  isPlatformAdmin,
  hasBusinessAccess,
} from '@/lib/auth/middleware-utils';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;

  // Extract subdomain (handle localhost and production domains)
  let subdomain = '';

  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Local development: use query param or header for testing
    // e.g., http://localhost:3000?subdomain=demo
    subdomain = url.searchParams.get('subdomain') || '';
    console.log('[Middleware] Detected localhost, subdomain from query:', subdomain);
  } else {
    // Production: extract from hostname
    // e.g., demo.puncto.com.br -> demo
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      subdomain = parts[0];
    }
  }

  // Check if user is authenticated (has Firebase auth cookie)
  // Firebase sets __session cookie for authenticated users
  const hasAuthCookie = request.cookies.has('__session') ||
                        request.cookies.has('firebase-auth-token') ||
                        request.cookies.has('firebaseIdToken');

  // Get custom claims from JWT token (if authenticated)
  const customClaims = hasAuthCookie ? await getCustomClaimsFromRequest(request) : null;

  // Auth routes - redirect if already logged in
  if (url.pathname.startsWith('/auth/')) {
    // Allow auth routes to proceed (they handle their own redirects)
    return NextResponse.next();
  }

  // Platform admin routes - STRICT USER TYPE ENFORCEMENT
  if (subdomain === 'admin') {
    // Require authentication for platform routes
    if (!hasAuthCookie && !url.pathname.startsWith('/auth/')) {
      return NextResponse.redirect(
        new URL(`/auth/platform/login?returnUrl=${encodeURIComponent(url.pathname)}`, request.url)
      );
    }

    // CRITICAL: Verify user is platform admin
    if (hasAuthCookie && !url.pathname.startsWith('/auth/')) {
      if (!customClaims || !isPlatformAdmin(customClaims)) {
        // User is authenticated but NOT a platform admin
        console.warn('[Middleware] Unauthorized platform admin access attempt:', {
          userType: customClaims?.userType,
          platformAdmin: customClaims?.platformAdmin,
        });

        // Redirect to unauthorized page
        return NextResponse.redirect(new URL('/unauthorized?reason=platform_admin_required', request.url));
      }
    }

    // Rewrite to /platform/* routes
    return NextResponse.rewrite(new URL(`/platform${url.pathname}`, request.url));
  }

  // Main domain (marketing site)
  if (!subdomain || subdomain === 'www' || hostname === 'puncto.com.br') {
    // Redirect blog routes - commented out until we have blog content
    if (url.pathname === '/blog' || url.pathname.startsWith('/blog/')) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Allow marketing routes to pass through
    // Marketing pages are in (marketing) route group
    console.log('[Middleware] No subdomain or www/main domain, passing through to marketing site');
    return NextResponse.next();
  }

  // Handle demo subdomain for testing the booking page
  if (subdomain === 'demo') {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-business-slug', 'demo');
    
    return NextResponse.rewrite(
      new URL(`/tenant${url.pathname}${url.search}`, request.url),
      {
        request: {
          headers: requestHeaders,
        },
      }
    );
  }

  console.log('[Middleware] Business subdomain detected:', subdomain, '- rewriting to /tenant');

  // Business subdomain
  // Store businessSlug in header for server components to access
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-business-slug', subdomain);

  // Protected admin routes within tenant subdomain - STRICT USER TYPE ENFORCEMENT
  if (url.pathname.startsWith('/tenant/admin') || url.pathname.startsWith('/admin')) {
    if (!hasAuthCookie) {
      return NextResponse.redirect(
        new URL(`/auth/business/login?subdomain=${subdomain}&returnUrl=${encodeURIComponent(url.pathname + url.search)}`, request.url)
      );
    }

    // CRITICAL: Verify user is business_user with access to this business
    if (hasAuthCookie && customClaims) {
      const hasAccess = hasBusinessAccess(customClaims, subdomain);

      if (!hasAccess) {
        console.warn('[Middleware] Unauthorized business admin access attempt:', {
          userType: customClaims.userType,
          businessId: subdomain,
          businessRoles: customClaims.businessRoles,
        });

        // Customer users trying to access business admin -> redirect to unauthorized
        if (customClaims.userType === 'customer') {
          return NextResponse.redirect(new URL('/unauthorized?reason=business_admin_required', request.url));
        }

        // Platform admin has access (already checked in hasBusinessAccess)
        // Business user without role in this business -> redirect to their own business
        if (customClaims.userType === 'business_user' && customClaims.primaryBusinessId) {
          return NextResponse.redirect(
            new URL(`?subdomain=${customClaims.primaryBusinessId}`, request.url)
          );
        }

        // Fallback: redirect to business login
        return NextResponse.redirect(new URL('/auth/business/login', request.url));
      }
    }
  }

  // Protected customer account routes
  if (url.pathname.startsWith('/tenant/my-bookings') ||
      url.pathname.startsWith('/tenant/profile') ||
      url.pathname.startsWith('/my-bookings') ||
      url.pathname.startsWith('/profile')) {
    if (!hasAuthCookie) {
      return NextResponse.redirect(
        new URL(`/auth/customer/login?returnUrl=${encodeURIComponent(url.pathname + url.search)}`, request.url)
      );
    }
  }

  // Rewrite to /tenant/* routes with slug in header
  const response = NextResponse.rewrite(
    new URL(`/tenant${url.pathname}${url.search}`, request.url),
    {
      request: {
        headers: requestHeaders,
      },
    }
  );

  // Set locale header for i18n (will be read by next-intl in server components)
  // Locale will be determined from business settings in tenant layout
  response.headers.set('x-locale', 'pt-BR'); // Default, will be overridden by business settings

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

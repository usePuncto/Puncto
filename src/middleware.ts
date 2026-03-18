import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getCustomClaimsFromRequest,
  isPlatformAdmin,
  hasBusinessAccess,
} from '@/lib/auth/middleware-utils';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const hostNoPort = hostname.split(':')[0];
  const url = request.nextUrl;

  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  const isNgrok = hostname.includes('ngrok') || hostname.includes('ngrok-free.app') || hostname.includes('ngrok.io');
  const useQuerySubdomain = isLocalhost || isNgrok;
  const rawUrl = request.url;

  // Extract subdomain and isGestaoApp (handle localhost, ngrok, and production)
  let subdomain = '';
  let isGestaoApp = false;

  if (useQuerySubdomain) {
    // Local development: ?subdomain=primazia or ?subdomain=salaodamaria&app=gestao
    subdomain = url.searchParams.get('subdomain') ?? '';
    if (!subdomain && rawUrl.includes('subdomain=primazia')) subdomain = 'primazia';
    if (!subdomain && rawUrl.includes('subdomain%3Dprimazia')) subdomain = 'primazia';
    if (!subdomain) subdomain = request.cookies.get('x-business-slug')?.value ?? '';
    isGestaoApp = url.searchParams.get('app') === 'gestao' || rawUrl.includes('app=gestao') || rawUrl.includes('app%3Dgestao');
  } else {
    // Production and local dev (puncto.local): primazia.puncto.com.br | {slug}.gestao.puncto.com.br | {slug}.puncto.com.br
    const parts = hostNoPort.split('.');
    if (hostNoPort === 'primazia.puncto.com.br' || hostNoPort === 'primazia.puncto.local') {
      subdomain = 'primazia';
    } else if (parts.length >= 4 && parts[1] === 'gestao') {
      subdomain = parts[0];
      isGestaoApp = true;
    } else if (parts.length >= 3) {
      subdomain = parts[0];
    }
  }

  // Early redirect for primazia on localhost/ngrok (unauthenticated)
  const hasPrimaziaSubdomain = rawUrl.includes('subdomain=primazia') || rawUrl.includes('subdomain%3Dprimazia');
  if (useQuerySubdomain && hasPrimaziaSubdomain && url.pathname === '/' && !request.cookies.has('__session') && !request.cookies.has('firebase-auth-token') && !request.cookies.has('firebaseIdToken')) {
    return NextResponse.redirect(new URL('/auth/platform/login?subdomain=primazia&returnUrl=/platform/dashboard', request.url));
  }

  // Check if user is authenticated (has Firebase auth cookie)
  const hasAuthCookie = request.cookies.has('__session') ||
                        request.cookies.has('firebase-auth-token') ||
                        request.cookies.has('firebaseIdToken');

  const customClaims = hasAuthCookie ? await getCustomClaimsFromRequest(request) : null;

  // Redirect deprecated auth/business paths (no longer exist)
  if (url.pathname === '/auth/business/login' || url.pathname.startsWith('/auth/business/login')) {
    const loginUrl = new URL('/auth/login', request.url);
    url.searchParams.forEach((v, k) => loginUrl.searchParams.set(k, v));
    return NextResponse.redirect(loginUrl, 301);
  }
  if (url.pathname === '/auth/business/signup' || url.pathname.startsWith('/auth/business/signup')) {
    return NextResponse.redirect(new URL('/industries', request.url), 301);
  }

  // Auth routes - allow to proceed
  if (url.pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Platform admin (primazia.puncto.com.br) - STRICT USER TYPE ENFORCEMENT
  if (subdomain === 'primazia') {
    if (!hasAuthCookie && !url.pathname.startsWith('/auth/')) {
      const loginUrl = new URL('/auth/platform/login', request.url);
      loginUrl.searchParams.set('returnUrl', url.pathname || '/platform/dashboard');
      loginUrl.searchParams.set('subdomain', 'primazia');
      return NextResponse.redirect(loginUrl);
    }
    if (hasAuthCookie && !url.pathname.startsWith('/auth/')) {
      if (!customClaims || !isPlatformAdmin(customClaims)) {
        return NextResponse.redirect(new URL('/unauthorized?reason=platform_admin_required', request.url));
      }
    }
    // API routes must not be rewritten - they live at /api/* not /platform/api/*
    if (url.pathname.startsWith('/api')) {
      const res = NextResponse.next();
      res.cookies.set('x-business-slug', 'primazia', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 });
      return res;
    }
    const platformPath = url.pathname.startsWith('/platform') ? url.pathname : `/platform${url.pathname}`;
    const res = NextResponse.rewrite(new URL(platformPath + (url.search || ''), request.url));
    res.cookies.set('x-business-slug', 'primazia', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 });
    return res;
  }

  // Main domain (marketing site) - no business subdomain
  if (!subdomain || subdomain === 'www' || hostNoPort === 'puncto.com.br' || hostNoPort === 'puncto.local') {
    if (url.pathname === '/blog' || url.pathname.startsWith('/blog/')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Handle demo subdomain
  if (subdomain === 'demo') {
    const demoRequestHeaders = new Headers(request.headers);
    demoRequestHeaders.set('x-business-slug', 'demo');
    if (hasAuthCookie && customClaims && (customClaims.userType === 'platform_admin' || customClaims.userType === 'business_user')) {
      demoRequestHeaders.set('x-ignore-auth', 'true');
    }
    return NextResponse.rewrite(
      new URL(`/tenant${url.pathname}${url.search}`, request.url),
      { request: { headers: demoRequestHeaders } }
    );
  }

  // On localhost/ngrok: redirect to set cookie for subdomain (preserve query params)
  if (useQuerySubdomain && url.searchParams.has('subdomain') && (url.pathname === '/' || url.pathname.startsWith('/tenant'))) {
    const basePath = url.pathname === '/' ? (isGestaoApp ? '/tenant/admin' : '/tenant') : url.pathname;
    const target = basePath + (url.search || '');
    const res = NextResponse.redirect(new URL(target, request.url));
    res.cookies.set('x-business-slug', subdomain, { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 60 });
    return res;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-business-slug', subdomain);
  requestHeaders.set('x-middleware-request-url', request.url);

  // Block old /admin path on public vitrine - redirect to gestao subdomain
  if (!isGestaoApp && subdomain !== 'primazia' && (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))) {
    if (useQuerySubdomain) {
      const target = new URL(request.url);
      target.pathname = url.pathname.replace(/^\/admin/, '') || '/';
      target.searchParams.set('subdomain', subdomain);
      target.searchParams.set('app', 'gestao');
      return NextResponse.redirect(target, 302);
    }
    return NextResponse.redirect(`https://${subdomain}.gestao.puncto.com.br/`, 302);
  }

  // Business Admin (.gestao) - domain-based protection
  if (isGestaoApp) {
    if (!hasAuthCookie) {
      return NextResponse.redirect(
        new URL(`/auth/login?subdomain=${subdomain}&returnUrl=${encodeURIComponent(url.pathname + url.search)}&app=gestao`, request.url)
      );
    }
    if (hasAuthCookie && customClaims) {
      const hasAccess = hasBusinessAccess(customClaims, subdomain);
      if (!hasAccess) {
        if (customClaims.userType === 'customer') {
          return NextResponse.redirect(new URL('/unauthorized?reason=business_admin_required', request.url));
        }
        if (customClaims.userType === 'business_user' && customClaims.primaryBusinessId) {
          if (useQuerySubdomain) {
            const redirectUrl = new URL(request.url);
            redirectUrl.searchParams.set('subdomain', customClaims.primaryBusinessId);
            redirectUrl.searchParams.set('app', 'gestao');
            return NextResponse.redirect(redirectUrl);
          }
          return NextResponse.redirect(new URL(`https://${customClaims.primaryBusinessId}.gestao.puncto.com.br/`, request.url));
        }
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }
    // Normalize: /tenant/admin/dashboard -> /dashboard so rewrite yields /tenant/admin/dashboard (no double path)
    let adminPath = url.pathname;
    if (adminPath.startsWith('/tenant/admin')) {
      adminPath = adminPath.slice('/tenant/admin'.length) || '';
    }
    if (adminPath === '/') adminPath = '';

    const gestaoResponse = NextResponse.rewrite(
      new URL(`/tenant/admin${adminPath}${url.search}`, request.url),
      { request: { headers: requestHeaders } }
    );
    gestaoResponse.headers.set('x-business-slug', subdomain);
    gestaoResponse.headers.set('x-middleware-request-url', request.url);
    gestaoResponse.cookies.set('x-business-slug', subdomain, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 });
    return gestaoResponse;
  }

  // Protected customer account routes
  const isProtectedCustomerRoute =
    url.pathname.startsWith('/tenant/my-bookings') ||
    url.pathname.startsWith('/tenant/profile') ||
    url.pathname.startsWith('/my-bookings') ||
    url.pathname.startsWith('/profile');
  if (isProtectedCustomerRoute) {
    if (!hasAuthCookie) {
      return NextResponse.redirect(
        new URL(`/auth/customer/login?returnUrl=${encodeURIComponent(url.pathname + url.search)}`, request.url)
      );
    }
    if (hasAuthCookie && (!customClaims || customClaims.userType !== 'customer')) {
      return NextResponse.redirect(
        new URL(`/auth/customer/login?returnUrl=${encodeURIComponent(url.pathname + url.search)}`, request.url)
      );
    }
  }

  requestHeaders.set('x-locale', 'pt-BR');
  const shouldIgnoreAuthOnClient =
    hasAuthCookie &&
    customClaims &&
    (customClaims.userType === 'platform_admin' || customClaims.userType === 'business_user');
  if (shouldIgnoreAuthOnClient) {
    requestHeaders.set('x-ignore-auth', 'true');
  }

  if (url.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (url.pathname.startsWith('/tenant')) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('x-business-slug', subdomain);
    response.headers.set('x-middleware-request-url', request.url);
    response.cookies.set('x-business-slug', subdomain, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 });
    return response;
  }

  const response = NextResponse.rewrite(
    new URL(`/tenant${url.pathname}${url.search}`, request.url),
    { request: { headers: requestHeaders } }
  );
  response.headers.set('x-business-slug', subdomain);
  response.headers.set('x-middleware-request-url', request.url);
  response.cookies.set('x-business-slug', subdomain, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)'],
};

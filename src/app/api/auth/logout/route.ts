/**
 * POST /api/auth/logout
 * Clear the session cookie. Call this before or after client-side signOut.
 */
import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  BUSINESS_SLUG_COOKIE,
  clearAuthCookieOptions,
} from '@/lib/auth/session-cookie';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const opts of clearAuthCookieOptions()) {
    response.cookies.set(SESSION_COOKIE_NAME, '', opts);
    response.cookies.set(BUSINESS_SLUG_COOKIE, '', opts);
  }
  // Clear legacy non-httpOnly cookies if present
  response.cookies.set('firebaseIdToken', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  response.cookies.set('firebase-auth-token', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  return response;
}

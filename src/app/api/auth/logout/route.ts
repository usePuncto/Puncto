/**
 * POST /api/auth/logout
 * Clear the session cookie. Call this before or after client-side signOut.
 */
import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = '__session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const clear = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
  };
  response.cookies.set(SESSION_COOKIE_NAME, '', clear);
  // Clear legacy non-httpOnly cookies if present
  response.cookies.set('firebaseIdToken', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  response.cookies.set('firebase-auth-token', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  return response;
}

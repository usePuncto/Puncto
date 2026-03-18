/**
 * POST /api/auth/logout
 * Clear the session cookie. Call this before or after client-side signOut.
 */
import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = '__session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });
  return response;
}

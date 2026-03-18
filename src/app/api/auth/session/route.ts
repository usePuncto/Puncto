/**
 * POST /api/auth/session
 * Exchange Firebase ID token for a server-side session cookie.
 * Required so middleware can detect auth on full page loads (e.g. after login redirect).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';

const SESSION_COOKIE_NAME = '__session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days (Firebase max is 2 weeks)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body?.idToken;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing idToken' },
        { status: 400 }
      );
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error: unknown) {
    console.error('[Auth Session] Error creating session:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

/**
 * POST /api/auth/session-to-client
 * Exchange httpOnly __session (shared across *.puncto.com.br) for a Firebase custom token
 * so the client SDK can sign in on a different subdomain (www → *.gestao).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const customToken = await auth.createCustomToken(decoded.uid);

    return NextResponse.json({
      ok: true,
      customToken,
      uid: decoded.uid,
    });
  } catch (error: unknown) {
    console.error('[Auth session-to-client]', error);
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}

import { NextRequest } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';

/**
 * Platform admin via Bearer ID token or httpOnly session cookie.
 * Requires both platformAdmin claim and userType === 'platform_admin'.
 */
export async function verifyPlatformAdmin(
  request: NextRequest
): Promise<{ uid: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const decoded = await auth.verifyIdToken(token);
      if (decoded.platformAdmin === true && decoded.userType === 'platform_admin') {
        return { uid: decoded.uid };
      }
      return null;
    }

    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) return null;

    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    if (decoded.platformAdmin === true && decoded.userType === 'platform_admin') {
      return { uid: decoded.uid };
    }
    return null;
  } catch {
    return null;
  }
}

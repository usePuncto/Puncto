import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

// Simple JWT signing without external library (for Centrifugo)
// In production, consider using a JWT library
function signJWT(payload: any, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = require('crypto')
    .createHmac('sha256', secret)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');
  return `${header}.${payloadEncoded}.${signature}`;
}

const centrifugoSecret = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET?.trim() || '';

/**
 * Generate Centrifugo JWT token for authenticated user
 * POST /api/centrifugo/token
 */
export async function POST(request: NextRequest) {
  try {
    if (!centrifugoSecret || centrifugoSecret.length < 16) {
      return NextResponse.json(
        { error: 'Realtime token service is not configured' },
        { status: 503 }
      );
    }

    // Get Firebase ID token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(idToken);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's organization ID from custom claims or user document
    let orgId = decodedToken.orgId || null;
    
    if (!orgId) {
      // Try to get from user document
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      if (userData?.orgId) {
        orgId = userData.orgId;
      }
    }

    // Generate Centrifugo JWT token
    const now = Math.floor(Date.now() / 1000);
    const payload: any = {
      sub: decodedToken.uid,
      exp: now + 3600, // 1 hour
    };

    // If user has orgId, add channels they can subscribe to
    if (orgId) {
      payload.channels = [
        `org:${orgId}:bookings`,
        `org:${orgId}:orders`,
        `org:${orgId}:kitchen`,
        `org:${orgId}:timeclock`,
        `org:${orgId}:inventory`,
      ];
    }

    const token = signJWT(payload, centrifugoSecret);

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('[Centrifugo Token] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

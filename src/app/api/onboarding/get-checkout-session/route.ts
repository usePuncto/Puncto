import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { auth } from '@/lib/firebaseAdmin';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/get-checkout-session?sessionId=cs_...
 * Requires Bearer auth. Session metadata.userId must match the caller
 * (or caller email must match session customer_email).
 */
export async function GET(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = await checkIpRateLimit(`get-checkout-session:${ip}`, {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await auth.verifyIdToken(authHeader.slice('Bearer '.length));
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Checkout session not found' }, { status: 404 });
    }

    const metaUserId = session.metadata?.userId;
    const customerEmail = (session.customer_email || session.customer_details?.email || '')
      .toLowerCase()
      .trim();
    const tokenEmail = (decoded.email || '').toLowerCase().trim();

    const ownsByUserId = metaUserId && metaUserId === decoded.uid;
    const ownsByEmail = customerEmail && tokenEmail && customerEmail === tokenEmail;

    if (!ownsByUserId && !ownsByEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      url: session.status === 'open' ? session.url : null,
      status: session.status,
      paymentStatus: session.payment_status,
      businessId: session.metadata?.businessId,
    });
  } catch (error: unknown) {
    console.error('Error retrieving checkout session:', error);
    const message = error instanceof Error ? error.message : 'Error retrieving checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { isSubscriptionAccessBlocked } from '@/lib/business/subscription-access';

function looksLikeDocId(value: string): boolean {
  return /^[a-zA-Z0-9]{19,21}$/.test(value);
}

async function resolveBusiness(key: string) {
  if (looksLikeDocId(key)) {
    const doc = await db.collection('businesses').doc(key).get();
    if (!doc.exists) return null;
    const data = doc.data() as { slug?: string; subscription?: { status?: string } };
    return {
      id: doc.id,
      slug: (typeof data.slug === 'string' && data.slug.trim()) || key,
      subscriptionStatus: data.subscription?.status ?? null,
    };
  }

  const snap = await db.collection('businesses').where('slug', '==', key).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() as { slug?: string; subscription?: { status?: string } };
  return {
    id: doc.id,
    slug: (typeof data.slug === 'string' && data.slug.trim()) || key,
    subscriptionStatus: data.subscription?.status ?? null,
  };
}

/**
 * GET /api/business/access-status?key={slug|businessId}
 * Public check used at login to block suspended/cancelled businesses.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')?.trim();
  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    const business = await resolveBusiness(key);
    if (!business) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const blocked = isSubscriptionAccessBlocked(business.subscriptionStatus);

    return NextResponse.json({
      blocked,
      status: business.subscriptionStatus,
      businessId: business.id,
      slug: business.slug,
    });
  } catch (error) {
    console.error('[access-status]', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

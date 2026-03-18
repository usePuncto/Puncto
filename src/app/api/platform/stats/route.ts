import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

/**
 * Verify platform admin access
 */
async function verifyPlatformAdmin(request: NextRequest): Promise<{ uid: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      if (decodedToken.platformAdmin === true) {
        return { uid: decodedToken.uid };
      }
    } else {
      const cookies = request.cookies.getAll();
      const sessionCookie = cookies.find(c => c.name === '__session' || c.name === 'firebase-auth-token');
      if (sessionCookie) {
        const decoded = await auth.verifySessionCookie(sessionCookie.value, true);
        if (decoded.platformAdmin === true) {
          return { uid: decoded.uid };
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * GET /api/platform/stats
 * Get platform-wide statistics
 */
export async function GET(request: NextRequest) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessesSnapshot = await db.collection('businesses')
      .where('deletedAt', '==', null)
      .get();

    const totalBusinesses = businessesSnapshot.size;

    // Active = not suspended
    let activeBusinesses = 0;
    const tierCounts: Record<string, number> = { free: 0, basic: 0, pro: 0, enterprise: 0 };
    const industryCounts: Record<string, number> = {};
    let recentSignups = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    businessesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const sub = data.subscription;
      if (!sub || sub.status !== 'suspended') activeBusinesses++;

      const tier = sub?.tier || 'free';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;

      const industry = data.industry || 'general';
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;

      const created = data.createdAt?.toDate?.() || data.createdAt;
      if (created && new Date(created) >= thirtyDaysAgo) recentSignups++;
    });

    const usersCount = await db.collection('users').count().get();
    const totalUsers = usersCount.data().count;

    const recentBusinesses = businessesSnapshot.docs
      .sort((a, b) => {
        const aDate = a.data().createdAt?.toDate?.() || a.data().createdAt;
        const bDate = b.data().createdAt?.toDate?.() || b.data().createdAt;
        return (bDate ? new Date(bDate).getTime() : 0) - (aDate ? new Date(aDate).getTime() : 0);
      })
      .slice(0, 8)
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          displayName: d.displayName,
          slug: d.slug,
          industry: d.industry || 'general',
          tier: d.subscription?.tier || 'free',
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt,
        };
      });

    return NextResponse.json({
      stats: {
        totalBusinesses,
        activeBusinesses,
        totalUsers,
        recentSignups,
        tierDistribution: tierCounts,
        industryDistribution: industryCounts,
        recentBusinesses,
      },
    });
  } catch (error: any) {
    console.error('[Platform API] Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', message: error.message },
      { status: 500 }
    );
  }
}

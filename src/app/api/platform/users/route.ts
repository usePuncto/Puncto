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
 * GET /api/platform/users
 * List all users across all businesses
 */
export async function GET(request: NextRequest) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const role = searchParams.get('role'); // owner, manager, professional
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    let query = db.collection('users').limit(limit).offset(skip);

    // Note: Firestore doesn't support complex queries across collections
    // This is a simplified implementation
    // In production, you might want to denormalize data or use a different approach

    const snapshot = await query.get();

    let users = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userData: any = {
          id: doc.id,
          email: data.email,
          name: data.name,
          displayName: data.displayName,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          userType: data.type as string | undefined,
          studentBusinessId: data.studentBusinessId as string | undefined,
        };

        // Get user's token to check claims
        try {
          const userRecord = await auth.getUser(doc.id);
          const customClaims = userRecord.customClaims || {};
          
          userData.platformAdmin = customClaims.platformAdmin === true;
          userData.userType = (customClaims.userType as string) || userData.userType;
          userData.businessRoles = customClaims.businessRoles || {};
          userData.studentBusinessId =
            (customClaims.studentBusinessId as string) || userData.studentBusinessId;

          // Get businesses user belongs to
          const businessRoles = customClaims.businessRoles || {};
          userData.businesses = Object.keys(businessRoles).map((bid) => ({
            id: bid,
            role: businessRoles[bid],
          }));
        } catch (error) {
          console.error('Error getting user claims:', error);
        }

        if (userData.userType === 'student' && userData.studentBusinessId) {
          const existing = userData.businesses || [];
          const alreadyLinked = existing.some(
            (b: { id: string }) => b.id === userData.studentBusinessId
          );
          if (!alreadyLinked) {
            userData.businesses = [
              { id: userData.studentBusinessId, role: 'customer' },
              ...existing,
            ];
          }
        }

        return userData;
      })
    );

    // Apply filters (client-side)
    if (businessId) {
      users = users.filter((u) =>
        u.businessRoles?.[businessId] ||
        u.businesses?.some((b: { id: string }) => b.id === businessId) ||
        u.studentBusinessId === businessId
      );
    }

    if (role) {
      users = users.filter((u) => {
        if (role === 'customer') {
          return (
            u.userType === 'student' ||
            u.userType === 'customer' ||
            u.businesses?.some((b: { role: string }) => b.role === 'customer')
          );
        }
        return Object.values(u.businessRoles || {}).includes(role);
      });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter((u) =>
        u.email?.toLowerCase().includes(searchLower) ||
        u.name?.toLowerCase().includes(searchLower) ||
        u.displayName?.toLowerCase().includes(searchLower)
      );
    }

    const businessIds = new Set<string>();
    for (const u of users) {
      for (const b of u.businesses || []) {
        businessIds.add(b.id);
      }
    }

    const businessNames = new Map<string, string>();
    const ids = Array.from(businessIds);
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const refs = chunk.map((id) => db.collection('businesses').doc(id));
      const docs = await db.getAll(...refs);
      for (const doc of docs) {
        if (doc.exists) {
          const data = doc.data();
          businessNames.set(doc.id, data?.displayName || data?.legalName || doc.id);
        }
      }
    }

    users = users.map((u) => ({
      ...u,
      businesses: (u.businesses || []).map((b: { id: string; role: string }) => ({
        ...b,
        displayName: businessNames.get(b.id) ?? null,
      })),
    }));

    // Get total count
    const totalSnapshot = await db.collection('users').count().get();
    const total = totalSnapshot.data().count;

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Platform API] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', message: error.message },
      { status: 500 }
    );
  }
}

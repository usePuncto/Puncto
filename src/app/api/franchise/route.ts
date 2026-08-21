import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - Get franchise data (group or units)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data() as Record<string, any>;
    const isFranchiseGroup = businessData.isFranchiseGroup || false;
    const franchiseGroupId = businessData.franchiseGroupId;

    let franchiseData: any = {
      isFranchiseGroup,
      isFranchiseUnit: !!franchiseGroupId,
      franchiseGroupId: franchiseGroupId || null,
    };

    if (isFranchiseGroup) {
      // Get all franchise units
      const franchiseUnitIds = businessData.franchiseUnits || [];
      const units: any[] = [];
      
      for (const unitId of franchiseUnitIds) {
        const unitDoc = await db.collection('businesses').doc(unitId).get();
        if (unitDoc.exists) {
          const unitData = unitDoc.data();
          units.push({
            id: unitDoc.id,
            displayName: unitData?.displayName,
            slug: unitData?.slug,
            address: unitData?.address,
            active: !unitData?.deletedAt,
            rating: unitData?.rating,
            reviewsCount: unitData?.reviewsCount,
          });
        }
      }

      // Get aggregated metrics
      const metrics = await getFranchiseMetrics(businessId, franchiseUnitIds);

      franchiseData = {
        ...franchiseData,
        units,
        metrics,
      };
    } else if (franchiseGroupId) {
      // Get franchise group info
      const groupDoc = await db.collection('businesses').doc(franchiseGroupId).get();
      if (groupDoc.exists) {
        const groupData = groupDoc.data();
        franchiseData = {
          ...franchiseData,
          group: {
            id: groupDoc.id,
            displayName: groupData?.displayName,
            slug: groupData?.slug,
          },
        };
      }
    }

    return NextResponse.json(franchiseData);
  } catch (error) {
    console.error('[franchise GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch franchise data' },
      { status: 500 }
    );
  }
}

// POST - Create franchise group or add unit to group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId, franchiseGroupId, unitBusinessId } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (action === 'create_group') {
      // Mark business as franchise group
      await businessRef.update({
        isFranchiseGroup: true,
        franchiseUnits: [],
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Franchise group created',
        franchiseGroupId: businessId,
      });
    } else if (action === 'add_unit' && franchiseGroupId && unitBusinessId) {
      // Verify franchise group exists
      const groupDoc = await db.collection('businesses').doc(franchiseGroupId).get();
      if (!groupDoc.exists || !groupDoc.data()?.isFranchiseGroup) {
        return NextResponse.json(
          { error: 'Invalid franchise group' },
          { status: 400 }
        );
      }

      // Verify unit exists
      const unitDoc = await db.collection('businesses').doc(unitBusinessId).get();
      if (!unitDoc.exists) {
        return NextResponse.json(
          { error: 'Unit business not found' },
          { status: 404 }
        );
      }

      // Add unit to group
      const groupRef = db.collection('businesses').doc(franchiseGroupId);
      const groupData = groupDoc.data();
      const existingUnits = groupData?.franchiseUnits || [];
      
      if (!existingUnits.includes(unitBusinessId)) {
        await groupRef.update({
          franchiseUnits: [...existingUnits, unitBusinessId],
          updatedAt: new Date(),
        });
      }

      // Link unit to group
      await db.collection('businesses').doc(unitBusinessId).update({
        franchiseGroupId,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Unit added to franchise group',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action or missing parameters' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[franchise POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update franchise' },
      { status: 500 }
    );
  }
}

async function getFranchiseMetrics(franchiseGroupId: string, unitIds: string[]) {
  try {
    let totalRevenue = 0;
    let totalBookings = 0;
    let totalRating = 0;
    let totalReviews = 0;

    for (const unitId of unitIds) {
      // Get bookings for this unit
      const bookingsSnapshot = await db
        .collection('businesses')
        .doc(unitId)
        .collection('bookings')
        .where('status', 'in', ['confirmed', 'completed'])
        .get();

      totalBookings += bookingsSnapshot.size;

      // Calculate revenue from bookings
      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data();
        if (booking.status === 'completed' && booking.price) {
          totalRevenue += booking.price;
        }
      });

      // Get business rating
      const unitDoc = await db.collection('businesses').doc(unitId).get();
      if (unitDoc.exists) {
        const unitData = unitDoc.data();
        if (unitData?.rating && unitData?.reviewsCount) {
          totalRating += unitData.rating * unitData.reviewsCount;
          totalReviews += unitData.reviewsCount;
        }
      }
    }

    return {
      totalUnits: unitIds.length,
      totalRevenue,
      totalBookings,
      averageRating: totalReviews > 0 ? totalRating / totalReviews : 0,
    };
  } catch (error) {
    console.error('[getFranchiseMetrics] Error:', error);
    return {
      totalUnits: unitIds.length,
      totalRevenue: 0,
      totalBookings: 0,
      averageRating: 0,
    };
  }
}

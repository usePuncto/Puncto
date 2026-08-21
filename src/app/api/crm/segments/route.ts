import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { CustomerSegment } from '@/types/crm';
import { Customer } from '@/types/booking';
import { autoSegmentCustomers } from '@/lib/crm/segmentation';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - List all segments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const recalculate = searchParams.get('recalculate') === 'true';

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

    const segmentsRef = db.collection('businesses').doc(businessId).collection('customerSegments');
    const snapshot = await segmentsRef.orderBy('name', 'asc').get();
    const segments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CustomerSegment[];

    // Recalculate customer IDs if requested
    if (recalculate) {
      const customersRef = db.collection('businesses').doc(businessId).collection('customers');
      const customersSnapshot = await customersRef.get();
      const customers = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];

      const segmentMap = autoSegmentCustomers(customers, segments);

      // Update segments with new customer IDs
      const updatePromises = segments.map(async (segment) => {
        const customerIds = segmentMap.get(segment.id) || [];
        await segmentsRef.doc(segment.id).update({
          customerIds,
          updatedAt: new Date(),
        });
        return { ...segment, customerIds };
      });

      const updatedSegments = await Promise.all(updatePromises);
      return NextResponse.json({ segments: updatedSegments });
    }

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('[crm segments GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch segments' },
      { status: 500 }
    );
  }
}

// POST - Create a new segment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, segment } = body;

    if (!businessId || !segment) {
      return NextResponse.json(
        { error: 'businessId and segment are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    if (!segment.name || !segment.criteria) {
      return NextResponse.json(
        { error: 'name and criteria are required' },
        { status: 400 }
      );
    }

    const segmentsRef = db.collection('businesses').doc(businessId).collection('customerSegments');
    const now = new Date();

    const segmentData: Omit<CustomerSegment, 'id'> = {
      businessId,
      name: segment.name,
      criteria: segment.criteria,
      customerIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await segmentsRef.add(segmentData);

    return NextResponse.json({
      id: docRef.id,
      ...segmentData,
    });
  } catch (error) {
    console.error('[crm segments POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create segment' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Order } from '@/types/restaurant';
import { verifyBusinessFeatureAccess, extractBusinessIdFromQuery } from '@/lib/api/featureValidation';

export const dynamic = 'force-dynamic';

// GET - List all orders for a business
export async function GET(request: NextRequest) {
  try {
    const businessId = extractBusinessIdFromQuery(request);

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    // Verify business exists and has access to table ordering feature
    const featureCheck = await verifyBusinessFeatureAccess(businessId, 'tableOrdering');
    
    if (!featureCheck) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!featureCheck.hasAccess) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          message: `Table ordering feature is not available for your business type (${featureCheck.business.industry}) or subscription tier (${featureCheck.business.subscription.tier})`,
        },
        { status: 403 }
      );
    }

    const status = request.nextUrl.searchParams.get('status');
    const tableId = request.nextUrl.searchParams.get('tableId');

    const ordersRef = db.collection('businesses').doc(businessId).collection('orders');
    let query: FirebaseFirestore.Query = ordersRef.orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    if (tableId) {
      query = query.where('tableId', '==', tableId);
    }

    const snapshot = await query.get();
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('[orders GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

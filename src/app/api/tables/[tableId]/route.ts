import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Table } from '@/types/restaurant';
import { generateQRCodeDataUrl, getTableUrl } from '@/lib/utils/qrcode';
import { toPublicTable } from '@/lib/api/publicRestaurant';
import { isSubscriptionAccessBlocked } from '@/lib/business/subscription-access';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - Single table (public projection unless staff Bearer)
export async function GET(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessKey = searchParams.get('businessId');

    if (!businessKey) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    let resolvedBusinessId = businessKey;
    let businessDoc = await db.collection('businesses').doc(businessKey).get();

    if (!businessDoc.exists) {
      const bySlug = await db
        .collection('businesses')
        .where('slug', '==', businessKey)
        .limit(1)
        .get();
      if (bySlug.empty) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      businessDoc = bySlug.docs[0];
      resolvedBusinessId = businessDoc.id;
    }

    const biz = businessDoc.data();
    if (biz?.deletedAt || isSubscriptionAccessBlocked(biz?.subscription?.status)) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const tableDoc = await db
      .collection('businesses')
      .doc(resolvedBusinessId)
      .collection('tables')
      .doc(params.tableId)
      .get();

    if (!tableDoc.exists) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    const staffAuth = await requireBusinessAuth(request, resolvedBusinessId);
    const isStaff = !authError(staffAuth);
    const data = tableDoc.data() as Record<string, unknown>;

    return NextResponse.json(
      isStaff
        ? { id: tableDoc.id, ...data }
        : toPublicTable(tableDoc.id, {
            ...data,
            businessId: (data.businessId as string) || resolvedBusinessId,
          })
    );
  } catch (error) {
    console.error('[tables tableId GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    );
  }
}

// PUT - Update a table
export async function PUT(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const body = await request.json();
    const { businessId, updates } = body;

    if (!businessId || !updates) {
      return NextResponse.json(
        { error: 'businessId and updates are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    const tableRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('tables')
      .doc(params.tableId);

    const tableDoc = await tableRef.get();
    if (!tableDoc.exists) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // If number changed, regenerate QR code
    if (updates.number && updates.number !== tableDoc.data()?.number) {
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      const businessData = businessDoc.data();
      
      if (businessData?.slug) {
        const tableUrl = getTableUrl(businessData.slug, params.tableId);
        const qrCodeDataUrl = await generateQRCodeDataUrl(tableUrl);
        updates.qrCodeUrl = qrCodeDataUrl;
        updates.qrCodeData = tableUrl;
      }
    }

    await tableRef.update({
      ...updates,
      updatedAt: new Date(),
    });

    const updatedDoc = await tableRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[tables tableId PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a table
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
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


    const tableRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('tables')
      .doc(params.tableId);

    const tableDoc = await tableRef.get();
    if (!tableDoc.exists) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    await tableRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tables tableId DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    );
  }
}

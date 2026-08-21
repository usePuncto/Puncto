import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Table } from '@/types/restaurant';
import { generateQRCodeDataUrl, getTableUrl } from '@/lib/utils/qrcode';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - List all tables for a business
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const tablesRef = db.collection('businesses').doc(businessId).collection('tables');
    const snapshot = await tablesRef.orderBy('number', 'asc').get();
    
    const tables = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('[tables GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

// POST - Create a new table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, table } = body;

    if (!businessId || !table) {
      return NextResponse.json(
        { error: 'businessId and table are required' },
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

    const businessData = businessDoc.data();
    if (!businessData?.slug) {
      return NextResponse.json(
        { error: 'Business slug not found' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!table.number || !table.capacity) {
      return NextResponse.json(
        { error: 'Table number and capacity are required' },
        { status: 400 }
      );
    }

    // Generate table URL and QR code
    const tableId = `temp-${Date.now()}`; // Temporary ID for URL generation
    const tableUrl = getTableUrl(businessData.slug, tableId);
    const qrCodeDataUrl = await generateQRCodeDataUrl(tableUrl);

    // TODO: Upload QR code to Firebase Storage and get URL
    // For now, we'll store the data URL (not ideal for production)
    const qrCodeUrl = qrCodeDataUrl;

    const tablesRef = db.collection('businesses').doc(businessId).collection('tables');
    const now = new Date();

    const tableData: Omit<Table, 'id'> = {
      businessId,
      number: table.number,
      capacity: table.capacity,
      location: table.location || 'indoor',
      qrCodeUrl,
      qrCodeData: tableUrl.replace(tableId, '{{tableId}}'), // Template to replace later
      active: table.active !== undefined ? table.active : true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await tablesRef.add(tableData);

    // Update QR code with actual table ID
    const actualTableUrl = getTableUrl(businessData.slug, docRef.id);
    const actualQrCodeDataUrl = await generateQRCodeDataUrl(actualTableUrl);
    
    await docRef.update({
      qrCodeUrl: actualQrCodeDataUrl,
      qrCodeData: actualTableUrl,
    });

    const updatedDoc = await docRef.get();
    return NextResponse.json({
      id: docRef.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('[tables POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    );
  }
}

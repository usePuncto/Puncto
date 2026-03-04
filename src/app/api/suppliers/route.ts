import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Supplier } from '@/types/purchases';

// GET - List all suppliers
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

    const suppliersRef = db.collection('businesses').doc(businessId).collection('suppliers');
    const snapshot = await suppliersRef.orderBy('name', 'asc').get();

    const suppliers = snapshot.docs
      .filter((doc) => (doc.data().active ?? true) === true)
      .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('[suppliers GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST - Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, supplier } = body;

    if (!businessId || !supplier) {
      return NextResponse.json(
        { error: 'businessId and supplier are required' },
        { status: 400 }
      );
    }

    if (!supplier.name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    const suppliersRef = db.collection('businesses').doc(businessId).collection('suppliers');
    const now = new Date();

    const baseData: Record<string, unknown> = {
      businessId,
      name: supplier.name,
      active: supplier.active !== undefined ? supplier.active : true,
      createdAt: now,
      updatedAt: now,
    };
    if (supplier.contactName != null && supplier.contactName !== '') baseData.contactName = supplier.contactName;
    if (supplier.email != null && supplier.email !== '') baseData.email = supplier.email;
    if (supplier.phone != null && supplier.phone !== '') baseData.phone = supplier.phone;
    if (supplier.address != null) baseData.address = supplier.address;
    if (supplier.taxId != null && supplier.taxId !== '') baseData.taxId = supplier.taxId;
    if (supplier.paymentTerms != null && supplier.paymentTerms !== '') baseData.paymentTerms = supplier.paymentTerms;

    const docRef = await suppliersRef.add(baseData);

    return NextResponse.json({
      id: docRef.id,
      ...baseData,
    });
  } catch (error) {
    console.error('[suppliers POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}

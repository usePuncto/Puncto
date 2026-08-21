import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Order } from '@/types/restaurant';
import {
  prepareNFCeData,
  generateNFCeTecnoSpeed,
  generateNFCeENotas,
  generateNFCePlugNotas,
} from '@/lib/tax/nfce';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// POST - Generate NFC-e for an order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, orderId, provider } = body;

    if (!businessId || !orderId) {
      return NextResponse.json(
        { error: 'businessId and orderId are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const business = authResult.business;

    // Get order
    const orderDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('orders')
      .doc(orderId)
      .get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = {
      id: orderDoc.id,
      ...orderDoc.data(),
    } as Order;

    // Check if order is paid
    if (order.status !== 'paid') {
      return NextResponse.json(
        { error: 'Order must be paid to generate NFC-e' },
        { status: 400 }
      );
    }

    // Prepare NFC-e data
    const nfceData = prepareNFCeData(order, business);

    // Get tax provider configuration from business settings
    const settings = business.settings as any;
    const taxProvider = provider || settings?.taxProvider || 'tecnospeed';
    const apiKey = settings?.taxApiKey || '';
    const apiUrl = settings?.taxApiUrl || '';

    if (!apiKey || !apiUrl) {
      return NextResponse.json(
        { error: 'Tax provider API credentials not configured' },
        { status: 400 }
      );
    }

    // Generate NFC-e based on provider
    let nfceResult;
    switch (taxProvider) {
      case 'tecnospeed':
        nfceResult = await generateNFCeTecnoSpeed(nfceData, apiKey, apiUrl);
        break;
      case 'enotas':
        nfceResult = await generateNFCeENotas(nfceData, apiKey, apiUrl);
        break;
      case 'plugnotas':
        nfceResult = await generateNFCePlugNotas(nfceData, apiKey, apiUrl);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid tax provider' },
          { status: 400 }
        );
    }

    // Store NFC-e in Firestore
    const nfceRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('nfces')
      .doc();

    await nfceRef.set({
      orderId,
      nfceNumber: nfceResult.nfceNumber,
      accessKey: nfceResult.accessKey,
      xml: nfceResult.xml,
      provider: taxProvider,
      createdAt: new Date(),
    });

    // Update order with NFC-e reference
    await orderDoc.ref.update({
      nfceId: nfceRef.id,
      nfceNumber: nfceResult.nfceNumber,
      nfceAccessKey: nfceResult.accessKey,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      nfceId: nfceRef.id,
      nfceNumber: nfceResult.nfceNumber,
      accessKey: nfceResult.accessKey,
      qrCodeUrl: `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=${nfceResult.accessKey}`,
    });
  } catch (error) {
    console.error('[tax nfce generate POST] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate NFC-e: ${errorMessage}` },
      { status: 500 }
    );
  }
}

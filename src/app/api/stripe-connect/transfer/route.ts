import { NextRequest, NextResponse } from 'next/server';
import { createTransfer } from '@/lib/stripe/connect';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      paymentId,
      bookingId,
      professionalId,
      amount,
      currency,
      commissionId,
      commissionPercent,
      transferGroup,
      metadata = {},
    } = body;

    if (!businessId || !professionalId || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get professional to get Connect account ID
    const professionalRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('professionals')
      .doc(professionalId);

    const professionalDoc = await professionalRef.get();
    if (!professionalDoc.exists) {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      );
    }

    const professionalData = professionalDoc.data();
    if (!professionalData?.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Professional does not have a Stripe Connect account' },
        { status: 400 }
      );
    }

    // Create transfer
    const transfer = await createTransfer({
      amount,
      currency,
      destination: professionalData.stripeConnectAccountId,
      transferGroup: transferGroup || `booking_${bookingId}`,
      metadata: {
        ...metadata,
        businessId,
        bookingId: bookingId || '',
        professionalId,
      },
    });

    // If we were called from the commission trigger, update the existing doc.
    if (commissionId) {
      const commissionRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('commissions')
        .doc(String(commissionId));

      const commissionSnap = await commissionRef.get();
      if (!commissionSnap.exists) {
        return NextResponse.json(
          { error: 'Commission not found' },
          { status: 404 }
        );
      }

      await commissionRef.update({
        stripeTransferId: transfer.id,
        stripeConnectAccountId: professionalData.stripeConnectAccountId,
        status: 'processing',
        updatedAt: Timestamp.now(),
        // Keep the already-calculated `amount`/`percentage` from the trigger.
      });

      return NextResponse.json({
        transferId: transfer.id,
        commissionId: String(commissionId),
      });
    }

    // Otherwise, create a new commission record.
    const commissionData = {
      paymentId: paymentId || null,
      bookingId: bookingId || null,
      businessId,
      professionalId,
      professionalName: professionalData.name || '',
      amount,
      percentage: commissionPercent ?? professionalData.commissionPercent ?? 0,
      stripeTransferId: transfer.id,
      stripeConnectAccountId: professionalData.stripeConnectAccountId,
      status: 'processing',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const commissionsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('commissions');

    const commissionDoc = await commissionsRef.add(commissionData);

    return NextResponse.json({
      transferId: transfer.id,
      commissionId: commissionDoc.id,
    });
  } catch (error) {
    console.error('[create-transfer] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create transfer: ${errorMessage}` },
      { status: 500 }
    );
  }
}

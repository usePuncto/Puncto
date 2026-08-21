import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { processRefund, calculateRefund } from '@/lib/stripe/refunds';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      paymentId,
      bookingId,
      amount, // Optional: if not provided, calculates based on cancellation policy
      reason = 'requested_by_customer',
    } = body;

    if (!businessId || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, paymentId' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    // Get payment document
    const paymentRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('payments')
      .doc(paymentId);

    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const paymentData = paymentDoc.data();
    if (!paymentData) {
      return NextResponse.json(
        { error: 'Payment data not found' },
        { status: 404 }
      );
    }

    // If amount not provided, calculate based on cancellation policy
    let refundAmount = amount;
    if (refundAmount === undefined && bookingId) {
      // Get booking and cancellation policy
      const bookingDoc = await db
        .collection('businesses')
        .doc(businessId)
        .collection('bookings')
        .doc(bookingId)
        .get();

      if (bookingDoc.exists) {
        const bookingData = bookingDoc.data();
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        const businessData = businessDoc.data();

        if (bookingData && businessData?.settings?.cancellationPolicy) {
          const scheduledDateTime = bookingData.scheduledDateTime?.toDate();
          const hoursUntilService = scheduledDateTime
            ? (scheduledDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
            : 0;

          const calculation = calculateRefund(
            paymentData.amount || 0,
            businessData.settings.cancellationPolicy,
            hoursUntilService
          );
          refundAmount = calculation.refundAmount;
        } else {
          refundAmount = paymentData.amount || 0; // Full refund if no policy
        }
      } else {
        refundAmount = paymentData.amount || 0; // Full refund if booking not found
      }
    } else if (refundAmount === undefined) {
      refundAmount = paymentData.amount || 0; // Full refund
    }

    if (!paymentData.stripePaymentIntentId) {
      return NextResponse.json(
        { error: 'Payment does not have a Stripe payment intent ID' },
        { status: 400 }
      );
    }

    // Process refund via Stripe
    const refund = await processRefund(
      paymentData.stripePaymentIntentId,
      refundAmount,
      reason
    );

    // Create refund record
    const refundData = {
      id: refund.id,
      paymentId,
      amount: refundAmount,
      currency: paymentData.currency || 'brl',
      reason,
      status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
      stripeRefundId: refund.id,
      createdAt: Timestamp.now(),
      processedAt: refund.status === 'succeeded' ? Timestamp.now() : undefined,
    };

    const refundsRef = paymentRef.collection('refunds');
    await refundsRef.add(refundData);

    // Update payment status
    const newRefundedAmount = (paymentData.refundedAmount || 0) + refundAmount;
    const newStatus = newRefundedAmount >= paymentData.amount ? 'refunded' : 'partially_refunded';

    await paymentRef.update({
      status: newStatus,
      refundedAmount: newRefundedAmount,
      updatedAt: Timestamp.now(),
    });

    // Update booking if linked
    if (bookingId) {
      const bookingRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('bookings')
        .doc(bookingId);

      await bookingRef.update({
        paymentStatus: 'refunded',
        updatedAt: Timestamp.now(),
      });
    }

    return NextResponse.json({
      refundId: refund.id,
      amount: refundAmount,
      status: refund.status,
    });
  } catch (error) {
    console.error('[refund] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to process refund: ${errorMessage}` },
      { status: 500 }
    );
  }
}

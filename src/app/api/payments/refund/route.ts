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

    const paidAmount = typeof paymentData.amount === 'number' ? paymentData.amount : 0;
    const alreadyRefunded =
      typeof paymentData.refundedAmount === 'number' ? paymentData.refundedAmount : 0;
    const maxRefundable = Math.max(0, paidAmount - alreadyRefunded);

    if (maxRefundable <= 0) {
      return NextResponse.json(
        { error: 'Payment has already been fully refunded' },
        { status: 400 }
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
            paidAmount,
            businessData.settings.cancellationPolicy,
            hoursUntilService
          );
          refundAmount = calculation.refundAmount;
        } else {
          refundAmount = maxRefundable;
        }
      } else {
        refundAmount = maxRefundable;
      }
    } else if (refundAmount === undefined) {
      refundAmount = maxRefundable;
    }

    if (
      typeof refundAmount !== 'number' ||
      !Number.isFinite(refundAmount) ||
      !Number.isInteger(refundAmount) ||
      refundAmount <= 0
    ) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      );
    }

    if (refundAmount > maxRefundable) {
      return NextResponse.json(
        {
          error: 'Refund amount exceeds remaining refundable balance',
          maxRefundable,
        },
        { status: 400 }
      );
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
    const newRefundedAmount = alreadyRefunded + refundAmount;
    const newStatus = newRefundedAmount >= paidAmount ? 'refunded' : 'partially_refunded';

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

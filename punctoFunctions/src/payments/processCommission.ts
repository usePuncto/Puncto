import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Process commission when a payment is completed
 */
export const processCommission = onDocumentCreated(
  {
    document: "businesses/{businessId}/payments/{paymentId}",
  },
  async (event) => {
    const paymentId = event.params.paymentId;
    const businessId = event.params.businessId;
    const payment = event.data?.data();

    if (!payment) {
      logger.error("[processCommission] No payment data found");
      return;
    }

    // Only process if payment succeeded
    if (payment.status !== "succeeded") {
      logger.info(`[processCommission] Payment ${paymentId} status is ${payment.status}, skipping commission`);
      return;
    }

    try {
      const currency = (payment.currency || "brl").toLowerCase();

      // Determine destination professional + commission percent.
      // - If payment is for a booking, use booking.professionalId.
      // - Otherwise, treat it as an "owner payout" and use the business owner professional.
      let professionalId: string | null = null;
      let bookingId: string | null = payment.bookingId || null;
      let professional: any | null = null;
      let commissionPercent: number = 0;

      if (bookingId) {
        // Get booking to find professional
        const bookingRef = db
          .collection("businesses")
          .doc(businessId)
          .collection("bookings")
          .doc(bookingId);

        const bookingDoc = await bookingRef.get();
        if (!bookingDoc.exists) {
          logger.error(`[processCommission] Booking ${bookingId} not found`);
          return;
        }

        const booking = bookingDoc.data();
        if (!booking?.professionalId) {
          logger.info(`[processCommission] Booking ${bookingId} has no professional, skipping commission`);
          return;
        }

        professionalId = booking.professionalId;

        // Get professional to check commission rate
        const professionalRef = db
          .collection("businesses")
          .doc(businessId)
          .collection("professionals")
          .doc(professionalId);

        const professionalDoc = await professionalRef.get();
        if (!professionalDoc.exists) {
          logger.error(`[processCommission] Professional ${professionalId} not found`);
          return;
        }

        professional = professionalDoc.data();
        commissionPercent = professional?.commissionPercent || 0;
      } else {
        // Payment not linked to booking (e.g. Payment Links).
        // Fallback: try to use the business owner professional.
        const businessDoc = await db.collection("businesses").doc(businessId).get();
        const businessData = businessDoc.data() as any | undefined;

        const createdByUserId = businessData?.createdBy;

        const prosRef = db.collection("businesses").doc(businessId).collection("professionals");

        // 1) Prefer explicit owner
        const ownerSnap = await prosRef.where("isOwner", "==", true).limit(1).get();
        // 2) Otherwise, try by business createdBy userId
        const createdBySnap =
          ownerSnap.empty && createdByUserId
            ? await prosRef.where("userId", "==", createdByUserId).limit(1).get()
            : null;

        const snap = !ownerSnap.empty
          ? ownerSnap
          : createdBySnap && !createdBySnap.empty
            ? createdBySnap
            : null;

        if (!snap || snap.empty) {
          logger.info(`[processCommission] Payment ${paymentId} has no booking and no owner professional found`);
          return;
        }

        professionalId = snap.docs[0].id;
        professional = snap.docs[0].data();
        commissionPercent = professional?.commissionPercent ?? 100;
      }

      if (!professionalId || !professional) {
        logger.info(`[processCommission] Payment ${paymentId} missing destination professional`);
        return;
      }

      if (commissionPercent <= 0) {
        logger.info(`[processCommission] Professional ${professionalId} has no commission rate`);
        return;
      }

      // Calculate commission amount
      const commissionAmount = Math.round((payment.amount * commissionPercent) / 100);

      // Comissão só para registro interno; não há repasse automático via Stripe Connect.
      const commissionData: any = {
        paymentId,
        bookingId,
        businessId,
        professionalId,
        professionalName: professional.name || "",
        amount: commissionAmount,
        percentage: commissionPercent,
        stripeConnectAccountId: null,
        status: "pending",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const commissionsRef = db
        .collection("businesses")
        .doc(businessId)
        .collection("commissions");

      const commissionDoc = await commissionsRef.add(commissionData);
      const commissionId = commissionDoc.id;

      logger.info(
        `[processCommission] Commission ${commissionId} recorded (${commissionAmount} ${currency}); Stripe transfer disabled`
      );
    } catch (error) {
      logger.error(`[processCommission] Error processing commission: ${error}`);
    }
  }
);

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Firestore trigger that checks waitlist when a booking is cancelled
 * and automatically assigns the first waitlist entry if there's a match
 */
export const onBookingCancel = onDocumentUpdated(
  {
    document: 'businesses/{businessId}/bookings/{bookingId}',
  },
  async (event) => {
    const bookingId = event.params.bookingId;
    const businessId = event.params.businessId;
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    // Check if status changed to cancelled
    if (before?.status === after?.status || after?.status !== 'cancelled') {
      return;
    }

    logger.info(`[onBookingCancel] Booking ${bookingId} cancelled, checking waitlist...`);

    try {
      const cancelledBooking = after;
      const serviceId = cancelledBooking.serviceId;
      const professionalId = cancelledBooking.professionalId;

      // Find matching waitlist entries
      let waitlistQuery = db
        .collection('businesses')
        .doc(businessId)
        .collection('waitlist')
        .where('status', '==', 'pending')
        .where('serviceId', '==', serviceId);

      if (professionalId) {
        waitlistQuery = waitlistQuery.where('professionalId', 'in', [professionalId, null]);
      }

      const waitlistSnapshot = await waitlistQuery.orderBy('createdAt', 'asc').limit(1).get();

      if (waitlistSnapshot.empty) {
        logger.info(`[onBookingCancel] No matching waitlist entries found`);
        return;
      }

      const waitlistEntry = waitlistSnapshot.docs[0];
      const waitlistData = waitlistEntry.data();

      logger.info(`[onBookingCancel] Found matching waitlist entry ${waitlistEntry.id}`);

      // Create new booking from waitlist entry
      const newBookingRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('bookings')
        .doc();

      await newBookingRef.set({
        ...cancelledBooking,
        id: newBookingRef.id,
        customerData: waitlistData.customerData,
        customerId: waitlistData.customerData?.userId || null,
        status: 'pending',
        waitlistSource: waitlistEntry.id,
        reminders: {},
        calendarEventSent: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        cancelledAt: undefined,
        cancelledBy: undefined,
        cancellationReason: undefined,
      });

      // Update waitlist entry status
      await waitlistEntry.ref.update({
        status: 'assigned',
        assignedBookingId: newBookingRef.id,
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info(`[onBookingCancel] Created new booking ${newBookingRef.id} from waitlist entry ${waitlistEntry.id}`);

      // Send notification to customer about the new booking
      // Implementation would call messaging functions here
    } catch (error: any) {
      logger.error(`[onBookingCancel] Error processing cancellation for booking ${bookingId}:`, error);
    }
  }
);

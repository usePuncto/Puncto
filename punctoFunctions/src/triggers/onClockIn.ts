import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
// ClockIn and Shift type definitions (inline for Firebase Functions)
interface ClockIn {
  id: string;
  businessId: string;
  userId: string;
  type: string;
  timestamp: any;
}

interface Shift {
  id: string;
  businessId: string;
  userId: string;
  startTime: any;
  endTime?: any;
  breakDuration?: number;
  totalHours?: number;
  overtimeHours?: number;
  status: string;
  clockIns: string[];
  createdAt?: any;
}

const db = getFirestore();

/**
 * Firestore trigger that validates clock-ins and creates/updates shifts
 */
export const onClockIn = onDocumentCreated(
  {
    document: 'businesses/{businessId}/clockIns/{clockInId}',
  },
  async (event) => {
    const clockInId = event.params.clockInId;
    const businessId = event.params.businessId;
    const clockIn = event.data?.data() as ClockIn;

    if (!clockIn) {
      logger.error('[onClockIn] No clock-in data found');
      return;
    }

    logger.info(`[onClockIn] Processing clock-in ${clockInId} for user ${clockIn.userId}`);

    try {
      // Get active shift for this user
      const shiftsRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('shifts');

      const activeShiftsSnapshot = await shiftsRef
        .where('userId', '==', clockIn.userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (clockIn.type === 'in') {
        // Create new shift if no active shift exists
        if (activeShiftsSnapshot.empty) {
          const newShift: Omit<Shift, 'id'> = {
            businessId,
            userId: clockIn.userId,
            startTime: clockIn.timestamp as Timestamp,
            status: 'active',
            clockIns: [clockInId],
            createdAt: clockIn.timestamp as Timestamp,
          };

          await shiftsRef.add(newShift);
          logger.info(`[onClockIn] Created new shift for user ${clockIn.userId}`);
        } else {
          // Update existing shift
          const shiftDoc = activeShiftsSnapshot.docs[0];
          const currentClockIns = shiftDoc.data().clockIns || [];
          await shiftDoc.ref.update({
            clockIns: [...currentClockIns, clockInId],
            updatedAt: Timestamp.now(),
          });
        }
      } else if (clockIn.type === 'out') {
        // Close active shift
        if (!activeShiftsSnapshot.empty) {
          const shiftDoc = activeShiftsSnapshot.docs[0];
          const shift = shiftDoc.data() as Shift;

          // Calculate total hours
          const startTime = (shift.startTime as Timestamp).toMillis();
          const endTime = (clockIn.timestamp as Timestamp).toMillis();
          const totalMinutes = (endTime - startTime) / (1000 * 60);
          const breakMinutes = shift.breakDuration || 0;
          const workMinutes = totalMinutes - breakMinutes;
          const totalHours = workMinutes / 60;

          // Calculate overtime (simplified - > 8 hours)
          const overtimeHours = Math.max(0, totalHours - 8);

          await shiftDoc.ref.update({
            endTime: clockIn.timestamp as Timestamp,
            totalHours,
            overtimeHours,
            status: 'completed',
            clockIns: [...(shift.clockIns || []), clockInId],
            updatedAt: Timestamp.now(),
          });

          logger.info(`[onClockIn] Closed shift for user ${clockIn.userId}, total hours: ${totalHours.toFixed(2)}`);
        }
      }

      logger.info(`[onClockIn] Clock-in ${clockInId} processed successfully`);
    } catch (error: any) {
      logger.error(`[onClockIn] Error processing clock-in ${clockInId}:`, error);
    }
  }
);

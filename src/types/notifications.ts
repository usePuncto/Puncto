import { Timestamp } from 'firebase/firestore';

export type BookingNotificationEventType =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.completed'
  | 'lesson_reschedule.pending';

export interface BookingNotification {
  id: string;
  businessId: string;
  /** Agendamento, ou ID de `lessonRescheduleRequest` para notificações de remarcação. */
  bookingId: string;
  recipientUserId: string;
  eventType: BookingNotificationEventType;

  isRead: boolean;
  readAt: Timestamp | Date | null;
  createdAt: Timestamp | Date;

  // Minimal booking snapshot for UI rendering
  serviceName: string;
  professionalName: string;
  customerName: string;
  scheduledDateTime: Timestamp | Date;
  bookingStatus: string;
}


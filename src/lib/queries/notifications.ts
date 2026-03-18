import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  BookingNotification,
  BookingNotificationEventType,
} from '@/types/notifications';

function normalizeNotification(data: any, id: string): BookingNotification {
  return {
    id,
    businessId: data.businessId,
    bookingId: data.bookingId,
    recipientUserId: data.recipientUserId,
    eventType: data.eventType as BookingNotificationEventType,

    isRead: !!data.isRead,
    readAt: data.readAt ?? null,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,

    serviceName: data.serviceName || '',
    professionalName: data.professionalName || '',
    customerName: data.customerName || '',
    scheduledDateTime: data.scheduledDateTime?.toDate?.() || data.scheduledDateTime,
    bookingStatus: data.bookingStatus || data.status || '',
  };
}

export function useNotifications(
  businessId: string,
  recipientUserId: string,
  options?: { limit?: number; onlyUnread?: boolean }
) {
  return useQuery({
    queryKey: [
      'notifications',
      businessId,
      recipientUserId,
      options?.onlyUnread ? 'unread' : 'all',
      options?.limit ?? null,
    ],
    queryFn: async () => {
      const notificationsRef = collection(db, 'businesses', businessId, 'notifications');

      let q: any = query(
        notificationsRef,
        where('recipientUserId', '==', recipientUserId),
        orderBy('createdAt', 'desc')
      );

      if (options?.onlyUnread) {
        q = query(q, where('isRead', '==', false));
      }

      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => normalizeNotification(d.data(), d.id));
    },
    enabled: !!businessId && !!recipientUserId,
  });
}

export function useUnreadNotificationsCount(businessId: string, recipientUserId: string) {
  return useQuery({
    queryKey: ['notifications_unread_count', businessId, recipientUserId],
    queryFn: async () => {
      const notificationsRef = collection(db, 'businesses', businessId, 'notifications');
      const q = query(
        notificationsRef,
        where('recipientUserId', '==', recipientUserId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    },
    enabled: !!businessId && !!recipientUserId,
  });
}

export function useMarkNotificationRead(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId }: { notificationId: string }) => {
      const notifRef = doc(db, 'businesses', businessId, 'notifications', notificationId);
      await updateDoc(notifRef, {
        isRead: true,
        readAt: Timestamp.now(),
      });
      return { notificationId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', businessId] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', businessId] });
      // Note: query keys include recipientUserId; invalidation above covers common cases.
    },
  });
}


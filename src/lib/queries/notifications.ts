import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
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
  const createdAt = data.createdAt?.toDate?.() || data.createdAt;
  const scheduledRaw = data.scheduledDateTime?.toDate?.() || data.scheduledDateTime;
  return {
    id,
    businessId: data.businessId,
    bookingId: data.bookingId,
    recipientUserId: data.recipientUserId,
    eventType: (data.eventType as BookingNotificationEventType) || 'booking.created',

    isRead: !!data.isRead,
    readAt: data.readAt ?? null,
    createdAt,

    serviceName: data.serviceName || '',
    professionalName: data.professionalName || '',
    customerName: data.customerName || '',
    scheduledDateTime: scheduledRaw || createdAt,
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

      // Build query - avoid orderBy to prevent composite index requirement
      let q: any = query(
        notificationsRef,
        where('recipientUserId', '==', recipientUserId)
      );

      if (options?.onlyUnread) {
        q = query(q, where('isRead', '==', false));
      }

      const snapshot = await getDocs(q);
      let items = snapshot.docs.map((d) => normalizeNotification(d.data(), d.id));

      // Sort by createdAt desc in memory
      items.sort((a, b) => {
        const aMs = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
        const bMs = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
        return bMs - aMs;
      });

      if (options?.limit) {
        items = items.slice(0, options.limit);
      }

      return items;
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


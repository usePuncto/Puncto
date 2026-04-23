'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { BookingNotification } from '@/types/notifications';
import { useMarkNotificationRead, useNotifications } from '@/lib/queries/notifications';

function formatNotificationTime(n: BookingNotification) {
  const dt =
    n.scheduledDateTime instanceof Date
      ? n.scheduledDateTime
      : new Date(n.scheduledDateTime as any);
  return format(dt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function NotificationsList({
  businessId,
  recipientUserId,
  pageSize = 50,
  initialOnlyUnread = false,
  onMarkedRead,
}: {
  businessId: string;
  recipientUserId: string;
  pageSize?: number;
  initialOnlyUnread?: boolean;
  onMarkedRead?: () => void;
}) {
  const t = useTranslations('notifications');
  const [onlyUnread, setOnlyUnread] = useState(initialOnlyUnread);
  const { data: notifications, isLoading } = useNotifications(businessId, recipientUserId, {
    limit: pageSize,
    onlyUnread,
  });
  const markRead = useMarkNotificationRead(businessId);

  const handleMarkAsRead = async (notificationId: string, isRead: boolean) => {
    if (isRead) return;
    await markRead.mutateAsync({ notificationId });
    onMarkedRead?.();
  };

  const getEventLabel = (n: BookingNotification) => {
    switch (n.eventType) {
      case 'booking.created':
        return t('booking.created', {
          serviceName: n.serviceName,
          professionalName: n.professionalName,
        });
      case 'booking.confirmed':
        return t('booking.confirmed', {
          serviceName: n.serviceName,
          professionalName: n.professionalName,
        });
      case 'booking.completed':
        return t('booking.completed', {
          serviceName: n.serviceName,
          professionalName: n.professionalName,
        });
      case 'lesson_reschedule.pending':
        return t('lessonReschedule.pending', {
          turmaName: n.serviceName,
          professionalName: n.professionalName || t('lessonReschedule.noProfessional'),
        });
      default:
        return t('booking.created', { serviceName: n.serviceName, professionalName: n.professionalName });
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyUnread(false)}
            className={`px-3 py-2 rounded-md text-sm border transition-colors ${
              !onlyUnread ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200'
            }`}
          >
            {t('tabs.all')}
          </button>
          <button
            type="button"
            onClick={() => setOnlyUnread(true)}
            className={`px-3 py-2 rounded-md text-sm border transition-colors ${
              onlyUnread ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200'
            }`}
          >
            {t('tabs.unread')}
          </button>
        </div>
      </div>

      {isLoading && notifications == null ? (
        <div className="text-sm text-neutral-500">{t('loading')}</div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-md border p-3 ${
                !n.isRead ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{getEventLabel(n)}</p>
                  {n.customerName && (
                    <p className="text-xs text-neutral-600 mt-1">{t('withCustomer', { customerName: n.customerName })}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">{formatNotificationTime(n)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {!n.isRead && <span className="text-[10px] font-semibold text-neutral-900">UNREAD</span>}
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(n.id, n.isRead)}
                    className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                      n.isRead
                        ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed'
                        : 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-50'
                    }`}
                    disabled={n.isRead || markRead.isPending}
                  >
                    {n.isRead ? t('actions.read') : t('actions.markRead')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-500">{t('empty')}</div>
      )}
    </div>
  );
}


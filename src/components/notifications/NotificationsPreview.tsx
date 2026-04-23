'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/lib/queries/notifications';
import { BookingNotification } from '@/types/notifications';

function formatNotificationTime(n: BookingNotification) {
  const dt =
    n.scheduledDateTime instanceof Date
      ? n.scheduledDateTime
      : new Date(n.scheduledDateTime as any);
  return format(dt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function eventTitle(t: ReturnType<typeof useTranslations>, n: BookingNotification) {
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
}

export function NotificationsPreview({
  businessId,
  recipientUserId,
  href,
  limit: max = 5,
}: {
  businessId: string;
  recipientUserId: string;
  href: string;
  limit?: number;
}) {
  const t = useTranslations('notifications');
  const { data: notifications, isLoading } = useNotifications(businessId, recipientUserId, {
    limit: max,
  });

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">{t('previewTitle')}</h2>
          <p className="text-sm text-neutral-600">{t('previewSubtitle')}</p>
        </div>
        <Link href={href} className="text-sm text-blue-600 hover:underline">
          {t('viewAll')}
        </Link>
      </div>

      {isLoading && notifications == null ? (
        <div className="text-sm text-neutral-500">{t('loading')}</div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={href}
              className={`block rounded-md border p-3 transition-colors ${
                !n.isRead ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-neutral-900">{eventTitle(t, n)}</p>
                <p className="text-xs text-neutral-500 whitespace-nowrap">{formatNotificationTime(n)}</p>
              </div>
              {n.customerName && (
                <p className="text-xs text-neutral-600 mt-1">
                  {t('withCustomer', { customerName: n.customerName })}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-500">{t('empty')}</div>
      )}
    </div>
  );
}


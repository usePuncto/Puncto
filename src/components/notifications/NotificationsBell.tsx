'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useUnreadNotificationsCount } from '@/lib/queries/notifications';

export function NotificationsBell({
  businessId,
  recipientUserId,
  href,
}: {
  businessId: string;
  recipientUserId: string;
  href: string;
}) {
  const t = useTranslations('notifications');
  const { data: unreadCount = 0 } = useUnreadNotificationsCount(businessId, recipientUserId);

  return (
    <Link
      href={href}
      className="relative inline-flex items-center justify-center rounded-lg px-2 py-2 text-neutral-700 hover:bg-neutral-100"
      aria-label={t('title')}
      title={t('title')}
    >
      <span className="text-lg">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1 text-xs font-medium text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}


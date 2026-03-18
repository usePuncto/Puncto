'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { NotificationsList } from '@/components/notifications/NotificationsList';

export default function ProfessionalNotificationsPage() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const t = useTranslations('notifications');

  if (!business || !user) {
    return (
      <div className="text-sm text-neutral-500">
        {t('loading')}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-600 mt-2">{t('subtitle')}</p>
      </div>

      <NotificationsList businessId={business.id} recipientUserId={user.id} />
    </div>
  );
}


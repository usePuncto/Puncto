'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { useCustomers } from '@/lib/queries/customers';

function isBirthdayToday(birthDate?: string): boolean {
  if (!birthDate) return false;
  const dt = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return false;
  const now = new Date();
  return dt.getDate() === now.getDate() && dt.getMonth() === now.getMonth();
}

export default function AdminNotificationsPage() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const t = useTranslations('notifications');
  const { data: customers = [] } = useCustomers(business?.id ?? '');
  const birthdayStudents = customers.filter((c) => isBirthdayToday(c.birthDate));

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

      {birthdayStudents.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">🎂 Aniversariantes de hoje</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {birthdayStudents.map((student) => (
              <li key={student.id}>
                {student.firstName} {student.lastName}
              </li>
            ))}
          </ul>
        </div>
      )}

      <NotificationsList businessId={business.id} recipientUserId={user.id} />
    </div>
  );
}


'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useCustomers } from '@/lib/queries/customers';
import { useServices } from '@/lib/queries/services';
import { useTurmas } from '@/lib/queries/turmas';
import { useAttendanceRollCallsRange } from '@/lib/queries/attendance';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { NotificationsPreview } from '@/components/notifications/NotificationsPreview';
import { format, startOfMonth } from 'date-fns';
import type { Customer } from '@/types/booking';
import { isBirthdayToday } from '@/lib/utils/birthdays';

function birthMonthDay(birthDate?: string): { month: number; day: number } | null {
  if (!birthDate) return null;
  const dt = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return { month: dt.getMonth(), day: dt.getDate() };
}

function birthdaysThisMonthSorted(customers: Customer[], ref: Date): { customer: Customer; day: number }[] {
  const m = ref.getMonth();
  const out: { customer: Customer; day: number }[] = [];
  for (const c of customers) {
    const md = birthMonthDay(c.birthDate);
    if (!md || md.month !== m) continue;
    out.push({ customer: c, day: md.day });
  }
  return out.sort((a, b) => a.day - b.day);
}

export default function AdminDashboardPage() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const t = useTranslations('dashboard');

  const isEducation = business?.industry === 'education';
  const businessId = business?.id ?? '';
  const educationBusinessId = isEducation ? businessId : '';

  const { data: customers = [], isLoading: customersLoading } = useCustomers(businessId);
  const { data: services = [], isLoading: servicesLoading } = useServices(isEducation ? '' : businessId);
  const { data: turmas = [], isLoading: turmasLoading } = useTurmas(educationBusinessId);

  const refDate = new Date();
  const monthStartStr = format(startOfMonth(refDate), 'yyyy-MM-dd');
  const todayStr = format(refDate, 'yyyy-MM-dd');

  const { data: attendanceMonth = [], isLoading: attendanceMonthLoading } = useAttendanceRollCallsRange(
    educationBusinessId,
    monthStartStr,
    todayStr,
    !!educationBusinessId,
  );

  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [purchasesCount, setPurchasesCount] = useState<number | null>(null);

  useEffect(() => {
    if (!businessId || isEducation) {
      setInventoryCount(null);
      setPurchasesCount(null);
      return;
    }
    Promise.all([
      fetch(`/api/inventory?businessId=${businessId}`)
        .then((r) => r.json())
        .then((d) => d.items?.length ?? 0)
        .catch(() => null),
      fetch(`/api/purchases?businessId=${businessId}`)
        .then((r) => r.json())
        .then((d) => d.purchaseOrders?.length ?? 0)
        .catch(() => null),
    ]).then(([inv, purch]) => {
      setInventoryCount(inv);
      setPurchasesCount(purch);
    });
  }, [businessId, isEducation]);

  const monthAttendancePct = useMemo(() => {
    if (!attendanceMonth.length) return null;
    let present = 0;
    for (const r of attendanceMonth) {
      if (r.status === 'present') present += 1;
    }
    return Math.round((present / attendanceMonth.length) * 100);
  }, [attendanceMonth]);

  const isLoading = isEducation
    ? customersLoading || turmasLoading || attendanceMonthLoading
    : customersLoading || servicesLoading;

  const emptySecondary = isEducation ? turmas.length === 0 : services.length === 0;
  if (isLoading && customers.length === 0 && emptySecondary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  const stats = isEducation
    ? [
        { label: t('statStudents'), value: customers.length, href: '/tenant/admin/customers', icon: '👤' },
        { label: t('statClasses'), value: turmas.length, href: '/tenant/admin/turmas', icon: '🎓' },
        {
          label: t('statMonthAttendance'),
          value: monthAttendancePct === null ? t('attendanceNoData') : `${monthAttendancePct}%`,
          href: '/tenant/admin/attendance',
          icon: '📝',
        },
      ]
    : [
        { label: t('statCustomers'), value: customers.length, href: '/tenant/admin/customers', icon: '👤' },
        { label: t('statServices'), value: services.length, href: '/tenant/admin/services', icon: '🏥' },
        { label: t('statInventoryItems'), value: inventoryCount ?? '—', href: '/tenant/admin/inventory', icon: '📦' },
        { label: t('statPurchaseOrders'), value: purchasesCount ?? '—', href: '/tenant/admin/purchases', icon: '🛒' },
      ];

  const birthdayStudents = customers.filter((c) => isBirthdayToday(c.birthDate));
  const monthBirthdays = isEducation ? birthdaysThisMonthSorted(customers, refDate) : [];

  const todayDay = refDate.getDate();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-600 mt-2">
          {isEducation ? t('overviewEducation') : t('overview')}
        </p>
      </div>

      <div
        className={`grid gap-4 ${
          isEducation ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-neutral-600">{stat.label}</p>
                <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {isEducation && (
        <p className="mt-4 text-sm text-neutral-600">
          Solicitações de reposição de faltas aparecem em{' '}
          <Link
            href="/tenant/admin/bookings?tab=reschedules"
            className="font-medium text-neutral-900 underline hover:text-neutral-700"
          >
            Calendário de aulas → aba Remarcações
          </Link>
          .
        </p>
      )}

      {isEducation && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900">{t('birthdaysMonthTitle')}</h2>
          {birthdayStudents.length > 0 && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t('birthdaysTodayLead', {
                count: birthdayStudents.length,
                date: format(refDate, 'dd/MM'),
              })}
            </p>
          )}
          {monthBirthdays.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600">{t('birthdaysEmpty')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100">
              {monthBirthdays.map(({ customer, day }) => {
                const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '—';
                let when: string;
                if (day === todayDay) when = t('birthdayToday');
                else if (day < todayDay) when = t('birthdayPassed');
                else when = t('birthdayInDays', { days: day - todayDay });

                return (
                  <li key={customer.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0">
                    <span className="text-neutral-900">{name}</span>
                    <span className="shrink-0 text-neutral-500">
                      {String(day).padStart(2, '0')}/{String(refDate.getMonth() + 1).padStart(2, '0')} · {when}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {birthdayStudents.length > 0 && !isEducation && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">{t('birthdaysTodayTitle')}</h2>
          <p className="mt-1 text-sm text-amber-800">
            {t('birthdaysTodayLead', {
              count: birthdayStudents.length,
              date: format(refDate, 'dd/MM'),
            })}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-amber-900">
            {birthdayStudents.slice(0, 10).map((student) => (
              <li key={student.id}>
                {student.firstName} {student.lastName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {business?.id && user?.id && (
        <div className="mt-6">
          <NotificationsPreview
            businessId={business.id}
            recipientUserId={user.id}
            href="/tenant/admin/notifications"
            limit={5}
          />
        </div>
      )}
    </div>
  );
}

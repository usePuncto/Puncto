'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useBookings } from '@/lib/queries/bookings';
import { useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { useTranslations } from 'next-intl';

export default function AdminDashboardPage() {
  const { business } = useBusiness();
  const t = useTranslations('dashboard');
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  
  const { data: bookings, isLoading } = useBookings(business.id, {
    startDate: thirtyDaysAgo,
    endDate: today,
  });

  const stats = useMemo(() => {
    if (!bookings) {
      return {
        totalBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        noShows: 0,
        occupancyRate: 0,
        totalRevenue: 0,
      };
    }

    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const noShows = bookings.filter((b) => b.status === 'no_show').length;
    
    // Calculate occupancy (confirmed + completed / total available slots - rough estimate)
    const occupancyRate = total > 0 ? ((confirmed + completed) / total) * 100 : 0;
    
    // Calculate revenue (only completed bookings)
    const totalRevenue = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (b.price || 0), 0);

    return {
      totalBookings: total,
      confirmedBookings: confirmed,
      completedBookings: completed,
      cancelledBookings: cancelled,
      noShows,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      totalRevenue,
    };
  }, [bookings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-600 mt-2">{t('overview')}</p>
      </div>

      <AnalyticsDashboard stats={stats} bookings={bookings || []} />
    </div>
  );
}

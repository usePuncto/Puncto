'use client';

import { Suspense } from 'react';
import { AdminBookingsView } from '@/components/admin/AdminBookingsView';

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
        </div>
      }
    >
      <AdminBookingsView />
    </Suspense>
  );
}

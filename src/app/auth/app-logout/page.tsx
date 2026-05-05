'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function AppLogoutContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch {
        // ignore
      }
      try {
        if (auth) await signOut(auth);
      } catch {
        // ignore
      }
      if (cancelled) return;

      const subdomain = searchParams.get('subdomain');
      const app = searchParams.get('app');
      const loginParams = new URLSearchParams();
      const returnUrlParam = searchParams.get('returnUrl');
      if (returnUrlParam) {
        loginParams.set('returnUrl', returnUrlParam);
      } else {
        const qs = new URLSearchParams();
        if (subdomain) qs.set('subdomain', subdomain);
        if (app) qs.set('app', app);
        const q = qs.toString();
        loginParams.set('returnUrl', `/tenant/admin/dashboard${q ? `?${q}` : ''}`);
      }
      if (subdomain) loginParams.set('subdomain', subdomain);
      if (app) loginParams.set('app', app);

      window.location.replace(`/auth/login?${loginParams.toString()}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <p className="text-neutral-600">Encerrando sessão…</p>
    </div>
  );
}

export default function AppLogoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <p className="text-neutral-600">Carregando…</p>
        </div>
      }
    >
      <AppLogoutContent />
    </Suspense>
  );
}

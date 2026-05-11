import type { User } from 'firebase/auth';
import { getAppExtraConfig } from '../config/webAppConfig';

function apiBase(): string {
  const { webAppUrl } = getAppExtraConfig();
  return webAppUrl.replace(/\/+$/, '');
}

export type MeResponse = {
  uid: string;
  email: string | null;
  businesses: { id: string; displayName: string; role: string }[];
  currentBusinessId: string | null;
};

export type DashboardResponse = {
  businessId: string;
  counts: { customers: number; services: number };
  recentBookings: {
    id: string;
    status?: string;
    serviceName?: string | null;
    customerName?: string | null;
    scheduledDateTime?: string | null;
  }[];
};

export type BookingsResponse = {
  businessId: string;
  bookings: {
    id: string;
    status?: string;
    serviceName?: string | null;
    professionalName?: string | null;
    customerName?: string | null;
    scheduledDateTime?: string | null;
    price?: number | null;
    notes?: string | null;
  }[];
};

async function authFetch<T>(user: User, path: string, businessId?: string | null): Promise<T> {
  const token = await user.getIdToken();
  const url = new URL(path, `${apiBase()}/`);
  if (businessId) url.searchParams.set('businessId', businessId);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMe(user: User, businessIdHint?: string | null): Promise<MeResponse> {
  const token = await user.getIdToken();
  const url = new URL('/api/mobile/admin/me', `${apiBase()}/`);
  if (businessIdHint) url.searchParams.set('businessId', businessIdHint);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<MeResponse>;
}

export async function fetchDashboard(user: User, businessId: string): Promise<DashboardResponse> {
  return authFetch<DashboardResponse>(user, '/api/mobile/admin/dashboard', businessId);
}

export async function fetchBookings(user: User, businessId: string, limit = 50): Promise<BookingsResponse> {
  const token = await user.getIdToken();
  const url = new URL('/api/mobile/admin/bookings', `${apiBase()}/`);
  url.searchParams.set('businessId', businessId);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<BookingsResponse>;
}

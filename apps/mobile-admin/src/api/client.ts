export type AuthTokens = {
  accessToken: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function request<T>(path: string, options: RequestInit = {}, tokens?: AuthTokens): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type LoginResponse = {
  accessToken: string;
  businessId: string;
  businessName: string;
};

export async function loginWithEmailPassword(email: string, password: string): Promise<LoginResponse> {
  // Wire this to your existing auth endpoint or Firebase custom token endpoint.
  return request<LoginResponse>('/auth/mobile/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchDashboardStats(tokens: AuthTokens) {
  return request('/api/mobile/admin/dashboard', { method: 'GET' }, tokens);
}

export async function fetchBookings(tokens: AuthTokens) {
  return request('/api/mobile/admin/bookings', { method: 'GET' }, tokens);
}

export async function fetchCustomers(tokens: AuthTokens) {
  return request('/api/mobile/admin/customers', { method: 'GET' }, tokens);
}


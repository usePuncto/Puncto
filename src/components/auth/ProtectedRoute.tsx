'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { getBusinessRole, isPlatformAdmin, isBusinessStaff } from '@/lib/permissions';
import type { User } from '@/types/user';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Require platform admin access
   */
  requirePlatformAdmin?: boolean;
  /**
   * Require staff access to a specific business
   */
  requireBusinessAccess?: string;
  /**
   * Allowed roles for this route
   */
  allowedRoles?: Array<'owner' | 'manager' | 'professional' | 'attendant'>;
  /**
   * Custom redirect path (default: /auth/login)
   */
  redirectTo?: string;
  /**
   * Loading component to show while checking auth
   */
  loadingComponent?: ReactNode;
}

function roleMatchesAllowed(
  user: User,
  allowedRoles: Array<'owner' | 'manager' | 'professional' | 'attendant'>,
  businessId?: string
): boolean {
  if (isPlatformAdmin(user)) return true;

  const normalize = (role: string | null | undefined) => {
    if (!role) return null;
    if (role === 'staff' || role === 'attendant') return 'attendant';
    return role;
  };

  if (businessId) {
    const role = normalize(getBusinessRole(user, businessId));
    return (
      role != null &&
      allowedRoles.includes(role as 'owner' | 'manager' | 'professional' | 'attendant')
    );
  }

  const roles = user.customClaims?.businessRoles || {};
  return Object.values(roles).some((r) => {
    const role = normalize(r);
    return (
      role != null &&
      allowedRoles.includes(role as 'owner' | 'manager' | 'professional' | 'attendant')
    );
  });
}

export function ProtectedRoute({
  children,
  requirePlatformAdmin,
  requireBusinessAccess,
  allowedRoles,
  redirectTo = '/auth/login',
  loadingComponent,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const rolesOk =
    !allowedRoles?.length ||
    (user != null && roleMatchesAllowed(user, allowedRoles, requireBusinessAccess));

  useEffect(() => {
    if (loading) return;

    // No user - redirect to login
    if (!user) {
      const currentPath = window.location.pathname + window.location.search;
      // Prefer www login from gestao so session cookie + sync-session stay consistent
      const isGestao =
        typeof window !== 'undefined' && window.location.hostname.includes('.gestao.');
      const subdomain = isGestao ? window.location.hostname.split('.')[0] : null;
      const params = new URLSearchParams({ returnUrl: currentPath });
      if (subdomain) {
        params.set('subdomain', subdomain);
        params.set('app', 'gestao');
      }
      const loginBase = isGestao ? 'https://www.puncto.com.br/auth/login' : redirectTo;
      if (isGestao) {
        window.location.href = `${loginBase}?${params.toString()}`;
      } else {
        router.push(`${redirectTo}?${params.toString()}`);
      }
      return;
    }

    // Check platform admin requirement
    if (requirePlatformAdmin && !isPlatformAdmin(user)) {
      router.push(redirectTo);
      return;
    }

    // Check business access requirement
    if (requireBusinessAccess && !isBusinessStaff(user, requireBusinessAccess)) {
      router.push(redirectTo);
      return;
    }

    // Check allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
      if (!roleMatchesAllowed(user, allowedRoles, requireBusinessAccess)) {
        router.push(redirectTo);
      }
    }
  }, [user, loading, requirePlatformAdmin, requireBusinessAccess, allowedRoles, redirectTo, router]);

  // Show loading state
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // User not authenticated or doesn't have access
  if (!user) {
    return null;
  }

  if (requirePlatformAdmin && !isPlatformAdmin(user)) {
    return null;
  }

  if (requireBusinessAccess && !isBusinessStaff(user, requireBusinessAccess)) {
    return null;
  }

  if (!rolesOk) {
    return null;
  }

  // User has access - render children
  return <>{children}</>;
}

/**
 * Higher-order component version of ProtectedRoute
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

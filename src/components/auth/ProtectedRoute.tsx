'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { isPlatformAdmin, isBusinessStaff } from '@/lib/permissions';

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

  useEffect(() => {
    if (loading) return;

    // No user - redirect to login
    if (!user) {
      const currentPath = window.location.pathname + window.location.search;
      const isGestao = typeof window !== 'undefined' && window.location.hostname.includes('.gestao.');
      const subdomain = isGestao ? window.location.hostname.split('.')[0] : null;
      const params = new URLSearchParams({ returnUrl: currentPath });
      if (subdomain) {
        params.set('subdomain', subdomain);
        params.set('app', 'gestao');
      }
      router.push(`${redirectTo}?${params.toString()}`);
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
      // For now, just check if user is authenticated
      // In production, you'd check user.role or user.customClaims
      // This is a simplified check
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

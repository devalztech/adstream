'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import type { Role } from '@/types/api';

/**
 * Frontend route protection — this is a UX convenience (don't show a
 * publisher the advertiser dashboard shell, redirect logged-out users
 * to /login) and NOT the actual security boundary. Every API call the
 * resulting pages make is independently authorized by the backend
 * (401 for no/invalid token, 403 for wrong role) regardless of what
 * this component decides to render. See INTEGRATION_MAP.md.
 */
export function RequireRole({
  role,
  children,
}: {
  role: Extract<Role, 'advertiser' | 'publisher' | 'admin'>;
  children: ReactNode;
}) {
  const { isAuthenticated, isLoading, role: currentRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (currentRole !== role) {
      // Logged in, but wrong dashboard — send them to their own rather
      // than showing a 403 page for a mistake that's usually just a
      // stale bookmark or a shared link.
      router.replace(currentRole ? `/${currentRole}/dashboard` : '/login');
    }
  }, [isLoading, isAuthenticated, currentRole, role, router]);

  if (isLoading || !isAuthenticated || currentRole !== role) {
    // A blank/loading shell rather than a flash of the protected content
    // before the redirect effect runs.
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}

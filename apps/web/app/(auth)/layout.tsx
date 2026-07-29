'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/useAuth';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      // Someone already logged in navigating to /login or /register
      // directly — send them to their dashboard instead of showing
      // the auth form again.
      router.replace(`/${role}/dashboard`);
    }
  }, [isLoading, isAuthenticated, role, router]);

  return <>{children}</>;
}

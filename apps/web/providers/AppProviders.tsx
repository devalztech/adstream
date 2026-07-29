'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { QueryProvider } from './QueryProvider';
import { ToastProvider } from './ToastProvider';
import { AuthProvider } from '@/lib/auth/AuthProvider';

/**
 * Order matters only in that AuthProvider's API calls should be able to
 * surface toasts on failure eventually — ToastProvider wraps outside
 * AuthProvider so any future toast-from-auth-error use case has the
 * context available. QueryProvider is independent of both.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

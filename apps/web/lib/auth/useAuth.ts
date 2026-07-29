'use client';

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './AuthProvider';

/**
 * Access the current auth session. Must be called within <AuthProvider>
 * (mounted in app/layout.tsx via providers/AppProviders.tsx) — throws
 * clearly rather than returning a silently-broken null context, so a
 * missing provider is caught immediately in development.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used within <AuthProvider>');
  }
  return ctx;
}

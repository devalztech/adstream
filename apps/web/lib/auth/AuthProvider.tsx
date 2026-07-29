'use client';

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type LoginInput, type RegisterInput } from '@/lib/api/auth';
import { setAccessToken } from '@/lib/auth/token-store';
import { ApiClientError } from '@/lib/api/errors';
import type { AuthResult, Role } from '@/types/api';

type SessionUser = AuthResult['user'];

export interface AuthContextValue {
  user: SessionUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  /** True only during the initial silent-refresh bootstrap on page load. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<SessionUser>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-checks the session — useful after an action that might have changed auth state elsewhere. */
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * IMPORTANT: this provider determines auth state for UX purposes only —
 * which nav links to show, which page to redirect to. It is NOT the
 * security boundary. Every API call still requires a valid access
 * token that the backend independently verifies; a user with cleared
 * frontend state but a still-valid refresh cookie is not "more secure"
 * by hiding buttons, and a user who bypasses frontend routing gets a
 * real 401/403 from the backend regardless. See INTEGRATION_MAP.md.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      // On a fresh page load there's no access token in memory yet —
      // attempt one refresh using the httpOnly cookie (if the user has
      // a valid session from a previous visit) to restore it silently.
      const result = await authApi.refresh();
      setAccessToken(result.accessToken);
      setUser(result.user);
    } catch {
      // No valid session — this is the normal logged-out state, not an error.
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const result = await authApi.login(input);
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await authApi.register(input);
    // Registration does not log the user in (email verification is
    // expected first) — see INTEGRATION_MAP.md. Callers redirect to
    // /login with a "check your email" message, they don't get a session here.
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // A failed logout call server-side (e.g. network issue) shouldn't
      // trap the user in a logged-in-looking UI — clear local state
      // regardless, since the access token in memory is discarded
      // either way once this function returns.
      if (!(err instanceof ApiClientError)) throw err;
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      refresh: bootstrap,
    }),
    [user, isLoading, login, register, logout, bootstrap]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

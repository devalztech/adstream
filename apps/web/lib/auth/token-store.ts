/**
 * The access token lives in memory only — never localStorage or
 * sessionStorage. A JWT in localStorage is readable by any injected
 * script (XSS), which defeats the point of a short-lived token. The
 * refresh token (httpOnly cookie, set by the backend) is what survives
 * a page reload; on reload, useAuth() calls /auth/refresh once to get a
 * fresh access token back into this store.
 *
 * This is a plain module-level variable, not React state, because the
 * API client (lib/api/client.ts) needs synchronous read access outside
 * of any React render — it's not itself a hook.
 */
let currentAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

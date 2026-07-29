import { NextResponse, type NextRequest } from 'next/server';

/**
 * IMPORTANT - read before touching this file: the access token lives in
 * memory on the client (see lib/auth/token-store.ts), not in a cookie
 * this middleware can read. The only cookie set by the backend is the
 * httpOnly refresh token, scoped to /api/v1/auth - Next middleware runs
 * on *this* app's origin and never sees it, and even if it did, decoding
 * whether it's still valid would mean re-implementing the backend's JWT
 * verification here.
 *
 * So this middleware does NOT attempt real auth/role checks - that
 * would either be security theater (checking for cookie presence,
 * which proves nothing) or require duplicating backend logic (the
 * spec explicitly prohibits duplicating backend business logic in
 * Next.js). The actual UX-layer protection is
 * components/layout/require-role.tsx, which has the real client-side
 * session state via useAuth(). The actual SECURITY boundary is the
 * backend's requireAuth/requireRole middleware, which every API call
 * goes through regardless of what this file does.
 *
 * This file exists as the extension point the spec asks for - headers,
 * redirects, or geo-based logic can go here later - without pretending
 * to do authorization it structurally cannot do correctly.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/advertiser/:path*', '/publisher/:path*', '/admin/:path*'],
};

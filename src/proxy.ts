import { isProtectedRoute } from '@/features/auth/rbac';
import { decodeAccessToken, isExpired } from '@/lib/jwt';
import { AUTH_TOKEN_COOKIE, clearAuthTokenCookie, REFRESH_TOKEN_COOKIE } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Route guard, run before every page renders. `AuthBootstrapGate` only
 * prevents the authenticated flash on a client that already has a session —
 * the actual "no session, get out" enforcement for a direct/refreshed
 * navigation happens here.
 *
 * The access-token cookie is decoded, not verified — this app holds no
 * signing secret and the backend re-checks every real API call regardless.
 * What this buys is that an arbitrary non-empty cookie value no longer counts
 * as a session, and an expired-but-refreshable one is distinguished from a
 * genuinely absent one.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const hasRefreshToken = !!request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const claims = token ? decodeAccessToken(token) : null;

  // `expired` is accepted for routing only while a refresh token is present:
  // the access token is meant to expire every 15 minutes and be rotated by
  // `/api/auth/me` / `/api/auth/refresh`, so bouncing on expiry alone would
  // sign everyone out constantly.
  const isAuthenticated = !!claims && (!isExpired(claims) || hasRefreshToken);

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // A cookie present but unusable (malformed, wrong shape) is misleading,
    // not just useless — drop it. A merely-expired one is left alone: it's
    // still the shape `/api/auth/me` can refresh from.
    if (token && !claims) clearAuthTokenCookie(response);
    return response;
  }

  if ((pathname === '/login' || pathname === '/register') && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

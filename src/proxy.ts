import { isProtectedRoute, isPublicRoute } from '@/features/auth/rbac';
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

  if ((isPublicRoute(pathname) || pathname === '/') && isAuthenticated) {
    // `/` itself has no content of its own (`app/page.tsx` just redirects to
    // /login) — without this, an authenticated visit to `/` would fall
    // through to that redirect and only get bounced to /dashboard on the
    // *next* pass through here, a visible extra hop through /login.
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // The trailing extension exclusion is load-bearing, not cosmetic: without it
  // every file served straight out of `public/` (the login page's own logo
  // and background images included) is treated as a protected route and
  // redirected to /login — which breaks the very page that's supposed to
  // show them. It's deliberately an explicit extension list, not `.*\..*` —
  // a bare "any dot anywhere" pattern would also exempt protected app routes
  // whose pathname happens to contain a dot (an email-shaped segment, a
  // dotted ID), silently skipping the auth check for them.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|eot)$).*)',
  ],
};

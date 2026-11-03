import { canAccessRoute, homeRouteForRoles, isProtectedRoute, isPublicRouteAllowedWhenAuthenticated } from '@/features/auth/rbac';
import { env } from '@/lib/env';
import {
  activeSessionFromAdoption,
  canRenewSession,
  isSessionIdleExpired,
  readActiveSession,
} from '@/lib/activeSession';
import { getClientIp } from '@/lib/clientIp';
import { adoptIamSession, applyIamCookies, needsIamAdoption, type AdoptedIamSession } from '@/lib/iamSession';
import { isExpired } from '@/lib/jwt';
import { clearAuthTokenCookie, clearIdleSessionCookies, setLoginOptionCookie } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Builds a fresh Content-Security-Policy for this one request. Nonces must be
 * regenerated per request — a reused value defeats the point (an attacker who
 * ever saw one could replay it) — which is why this lives here rather than in
 * the static `headers()` config in `next.config.ts`.
 *
 * `style-src` keeps `unsafe-inline`: several dashboard components (chart
 * bars, progress meters) set React inline `style={{...}}`, and Recharts'
 * SVG output does the same internally. Nonces don't cover style *attributes*
 * (only `<style>`/`<script>` tags), so a strict `style-src` would break real
 * UI without closing a meaningful attack surface — the vector CSP is actually
 * defending against here is script injection, and `script-src` stays strict.
 */
/**
 * The socket.io origin the realtime client connects to (see `env.REALTIME`),
 * or nothing when realtime is off. A malformed value is logged by the token
 * route that actually serves it; here it only means the socket stays blocked
 * rather than every page failing to render.
 */
function realtimeConnectSrc(): string {
  try {
    const realtime = env.REALTIME;
    return realtime ? ` ${realtime.url}` : '';
  } catch {
    return '';
  }
}

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    // i.pravatar.cc: the placeholder submitter avatar in SubmitterDetails.tsx.
    // blob: the client-side preview of a just-picked file in
    // GrievanceDetailsCard (URL.createObjectURL on the local File, before
    // it's ever uploaded) — without it the browser blocks its own object
    // URL and the preview modal shows nothing.
    `img-src 'self' data: blob: https://i.pravatar.cc`,
    // blob: the voice recorder's playback and the officer's attachment viewer play and
    // preview files through object URLs (audio element / PDF iframe).
    `media-src 'self' blob:`,
    `frame-src 'self' blob:`,
    `font-src 'self'`,
    `connect-src 'self'${realtimeConnectSrc()}${isDev ? ' ws: wss:' : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

/**
 * Route guard, run before every page renders. `AuthBootstrapGate` only
 * prevents the authenticated flash on a client that already has a session —
 * the actual "no session, get out" enforcement for a direct/refreshed
 * navigation happens here. It also stamps every response with a per-request
 * CSP nonce (see `buildCsp` above).
 *
 * The access-token cookie is decoded, not verified — this app holds no
 * signing secret and the backend re-checks every real API call regardless.
 * What this buys is that an arbitrary non-empty cookie value no longer counts
 * as a session, and an expired-but-refreshable one is distinguished from a
 * genuinely absent one.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  // Either a local session or an IAM one — see `activeSession.ts`. Both come
  // out in the same claims shape, so nothing below tells them apart.
  let session = readActiveSession(request);

  // An IAM session this app did not start — the user signed in at another
  // OpenG2P app — has no `login_option` yet: look it up once and record it on
  // whatever response goes out (see `adoptIamSession`). Only page loads do
  // this; every API call comes after one.
  let adopted: AdoptedIamSession | null = null;
  if (!session && needsIamAdoption(request)) {
    adopted = await adoptIamSession(request, getClientIp(request));
    if (adopted) session = activeSessionFromAdoption(request, adopted);
  }

  function withCsp(response: NextResponse): NextResponse {
    response.headers.set('Content-Security-Policy', csp);
    if (adopted) {
      applyIamCookies(response, adopted.setCookies);
      setLoginOptionCookie(response, adopted.option);
    }
    return response;
  }

  const token = session?.token;
  const claims = session?.claims ?? null;
  const canRenew = !!session && canRenewSession(session);
  // Classified once — `isProtectedRoute` is just `!isPublicRoute`, so
  // computing both separately below would run the same PUBLIC_ROUTES scan
  // twice per request on this route guard that runs on nearly every page load.
  const protectedRoute = isProtectedRoute(pathname);

  // `expired` is accepted for routing only while a refresh token is present:
  // the access token is meant to expire every 15 minutes and be rotated by
  // `/api/auth/me` / `/api/auth/refresh`, so bouncing on expiry alone would
  // sign everyone out constantly.
  const hasValidSession = !!claims && (!isExpired(claims) || canRenew);

  // A valid token pair only proves a session was *opened*, not that it's
  // still active. `last_activity` is the idle clock: refreshed by
  // `/api/auth/heartbeat` on real user interaction and by every login/refresh,
  // it naturally expires on its own once nothing has touched it for
  // `IDLE_TIMEOUT_MS`. Its absence on an otherwise-valid session means idle
  // timeout, not "never signed in" — hence the separate reason on redirect.
  //
  // Computed for every route, not just protected ones: an idle-expired
  // session must not count as authenticated on /login either, or a user who
  // navigates there directly gets silently bounced back into the app by the
  // isPublicRoute redirect below instead of seeing the login form — they'd
  // only actually get idle-kicked (with the cookie clearing and ?reason=idle
  // messaging below) on whatever protected route they hit *after* that.
  //
  // Local sessions only: an IAM session is single sign-on, its idle
  // timeout is IAM's, and it may well have been opened at another app (the
  // registry) that never started this app's clock — see `activeSession.ts`.
  const idleExpired = hasValidSession && isSessionIdleExpired(session, request);
  const isAuthenticated = hasValidSession && !idleExpired;

  if (protectedRoute && !isAuthenticated) {
    const response = NextResponse.redirect(new URL(idleExpired ? '/login?reason=idle' : '/login', request.url));
    if (idleExpired) {
      // Idle timeout ends the session for real, not just this one cookie —
      // unlike the malformed-token case below, there's a genuine live session
      // being closed out, so all of its cookies go with it. Any IAM session
      // the browser also holds stays (see `clearIdleSessionCookies`).
      clearIdleSessionCookies(response);
    } else if (session?.kind === 'local' && token && !claims) {
      // A cookie present but unusable (malformed, wrong shape) is misleading,
      // not just useless — drop it. A merely-expired one is left alone: it's
      // still the shape `/api/auth/me` can refresh from.
      clearAuthTokenCookie(response);
    }
    return withCsp(response);
  }

  // `isAuthenticated` implies `claims` is set (it requires `hasValidSession`,
  // which requires `!!claims`) — reconfirmed here so the checks below don't
  // need a non-null assertion on `claims`.
  if (isAuthenticated && claims && !isPublicRouteAllowedWhenAuthenticated(pathname)) {
    if (!protectedRoute || pathname === '/') {
      // `/` itself has no content of its own (`app/page.tsx` just redirects
      // to /login) — without this, an authenticated visit to `/` would fall
      // through to that redirect and only get bounced to /dashboard on the
      // *next* pass through here, a visible extra hop through /login.
      return withCsp(NextResponse.redirect(new URL(homeRouteForRoles(claims.roles), request.url)));
    }

    // Role check, same unverified-claim caveat as the rest of this function —
    // a route outside the caller's role bounces to their own home route
    // rather than /login (they *are* authenticated, just not for this screen).
    if (!canAccessRoute(pathname, claims.roles)) {
      return withCsp(NextResponse.redirect(new URL(homeRouteForRoles(claims.roles), request.url)));
    }
  }

  // Built here, not at the top of this function: every branch above this
  // point returns a redirect and never touches request.headers, so cloning
  // and stamping them would be wasted work on any of those paths — this is
  // the only line that consumes it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
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
    '/((?!api|_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|eot)$).*)',
  ],
};

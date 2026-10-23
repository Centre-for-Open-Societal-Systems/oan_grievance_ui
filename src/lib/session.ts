import { clearActivityCookie, touchActivityCookie } from '@/lib/idleSession';
import { encodeLoginOption, LOGIN_OPTION_COOKIE, type LoginOption } from '@/lib/loginOption';
import { NextResponse } from 'next/server';

// Single source of truth for the session cookies. Every route that opens,
// renews or ends a session goes through the helpers below, so a cookie can
// never be set in one place and forgotten in another.

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
/**
 * Records whether "Remember me" was ticked. The refresh route has no other
 * way to know: the refresh token is an opaque backend-issued string, so
 * without this a renewed cookie would silently get the long lifetime and a
 * short session would become a month-long one on the first refresh.
 */
export const SESSION_REMEMBER_COOKIE = 'session_remember';

/** Default session lifetime: 1 day. */
export const DEFAULT_SESSION_MAX_AGE = 24 * 60 * 60;
/** Session lifetime with "Remember me" ticked: 30 days. */
export const REMEMBERED_SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export function sessionMaxAge(rememberMe: boolean): number {
  return rememberMe ? REMEMBERED_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE;
}

// `strict`, not `lax`: `lax` still attaches cookies to top-level cross-site
// navigations, which is enough for an attacker-controlled link to drive an
// authenticated GET. The cost is that arriving from an external link lands on
// the login page for one navigation — accepted deliberately.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

interface SessionCookies {
  token?: string | undefined;
  refreshToken?: string | undefined;
  rememberMe: boolean;
}

/**
 * Writes the session cookies onto `response`.
 *
 * Both cookies carry the *session* lifetime, not the access token's own
 * 15-minute expiry — that's enforced inside the JWT and by the backend, while
 * the cookie is only the container.
 */
export function setSessionCookies(
  response: NextResponse,
  { token, refreshToken, rememberMe }: SessionCookies
): void {
  const maxAge = sessionMaxAge(rememberMe);

  if (token) {
    response.cookies.set(AUTH_TOKEN_COOKIE, token, { ...sessionCookieOptions, maxAge });
  }
  if (refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { ...sessionCookieOptions, maxAge });
  }
  response.cookies.set(SESSION_REMEMBER_COOKIE, rememberMe ? '1' : '0', {
    ...sessionCookieOptions,
    maxAge,
  });
  // Every fresh session cookie write resets the idle clock, whether it's a
  // login or a silent refresh — both are proof the session is genuinely live.
  touchActivityCookie(response);
  // At most one session kind at a time: a local session replaces any IAM
  // login option the browser recorded.
  clearLoginOptionCookie(response);
}

// `lax`, unlike the cookies above: it is set before the browser leaves for the
// identity provider and must be sent back with the redirect chain that ends
// at `/api/auth/iam/complete`, which starts cross-site. It holds no
// credential — IAM's own cookies do — only which option's cookies to read.
const loginOptionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/** Records the IAM login option the browser's session belongs to (see `loginOption.ts`). */
export function setLoginOptionCookie(response: NextResponse, option: LoginOption): void {
  response.cookies.set(LOGIN_OPTION_COOKIE, encodeLoginOption(option), loginOptionCookieOptions);
}

export function clearLoginOptionCookie(response: NextResponse): void {
  response.cookies.set(LOGIN_OPTION_COOKIE, '', { ...loginOptionCookieOptions, maxAge: 0 });
}

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

/** Reads back the remember-me choice made at login. Defaults to the short session. */
export function readRememberMe(request: CookieReader): boolean {
  return request.cookies.get(SESSION_REMEMBER_COOKIE)?.value === '1';
}

/**
 * Expires this app's own session cookies (a local password session) and
 * nothing else. Used when an IAM session replaces whatever local one the
 * browser still held. Options must match the ones used to set them.
 */
export function clearLocalSessionCookies(response: NextResponse): void {
  const expired = { ...sessionCookieOptions, maxAge: 0 };
  response.cookies.set(AUTH_TOKEN_COOKIE, '', expired);
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', expired);
  response.cookies.set(SESSION_REMEMBER_COOKIE, '', expired);
}

/**
 * Expires every session cookie this app owns, of either kind: its own local
 * session, the idle clock, and the IAM login option. IAM's cookies live on
 * IAM's parent domain and are cleared by the `Set-Cookie` headers IAM sends
 * back through oan_auth_service on logout or a refused refresh — the caller
 * relays those after this.
 */
export function clearSessionCookies(response: NextResponse): void {
  clearLocalSessionCookies(response);
  clearLoginOptionCookie(response);
  clearActivityCookie(response);
}

/**
 * Ends a session this app idled out. Only a local session idles out here (see
 * `isSessionIdleExpired`), so only its cookies and the idle clock go. IAM's
 * cookies and the login option stay: that single sign-on session is shared with the other apps on
 * the domain and is not this app's to end on its own idle clock — clearing
 * them would sign the user out of the registry too.
 */
export function clearIdleSessionCookies(response: NextResponse): void {
  clearLocalSessionCookies(response);
  clearActivityCookie(response);
}

/**
 * Expires only the access-token cookie, leaving the refresh token in place.
 *
 * For a cookie that doesn't decode as a usable JWT: that's not proof the
 * session is over (the refresh token is opaque and backend-validated), just
 * proof this particular cookie is unusable. Clearing both would discard a
 * live session and orphan its backend row.
 */
export function clearAuthTokenCookie(response: NextResponse): void {
  response.cookies.set(AUTH_TOKEN_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
}

import {
  applyIamCookies,
  type AdoptedIamSession,
  canRefreshIamSession,
  hasAppAccess,
  readIamSession,
  renewIamSession,
  type IamSession,
} from '@/lib/iamSession';
import { isIdleExpired } from '@/lib/idleSession';
import { decodeAccessToken, peekToken, type AccessTokenClaims } from '@/lib/jwt';
import { IAM_COOKIES, iamCookieName, type LoginOption } from '@/lib/loginOption';
import { AUTH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, setLoginOptionCookie, setSessionCookies } from '@/lib/session';
import { performRefresh } from '@/lib/sessionRefresh';
import type { NextRequest, NextResponse } from 'next/server';

// The two kinds of session a request can carry, behind one shape so every
// entry point (`/api/proxy/*`, `/api/auth/me`, `/api/auth/refresh`, the
// heartbeat, realtime config) handles both without branching on cookie names:
//
//   local — email/password via oan_auth_service: our own `auth_token` +
//           `refresh_token` cookies (session.ts)
//   iam   — an IAM login option (staff, agent, …) via oan_auth_service: IAM's
//           own cookies on the shared parent domain, found through the
//           `login_option` cookie (iamSession.ts, loginOption.ts)
//
// Local wins when a browser somehow holds both: it's the one this app issued.
//
// The two differ in who owns the session's lifetime. A local session is this
// app's alone, so this app's idle clock (`idleSession.ts`) governs it. An IAM
// session is single sign-on: one identity provider session shared with every
// other OpenG2P app (the registry, …), opened wherever the user signed in. Its
// idle and maximum lifetime belong to IAM and the provider, and every API call
// is verified by the backend — so this app neither idles it out nor requires
// it to have been opened here (`adoptIamSession`).

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

export type ActiveSession =
  | { kind: 'local'; token: string | undefined; claims: AccessTokenClaims | null; refreshToken: string | undefined }
  | { kind: 'iam'; token: string | undefined; claims: AccessTokenClaims | null; iam: IamSession };

/**
 * An IAM session's claims in the local shape: the token's expiry, and the
 * user and roles `/auth/me` answered (cached in `login_option`).
 */
function iamClaims(iam: IamSession): AccessTokenClaims | null {
  if (!iam.token) return null;
  return { sub: iam.option.user ?? iam.token.sub, roles: iam.option.roles ?? [], exp: iam.token.exp };
}

function iamActiveSession(iam: IamSession): ActiveSession {
  return { kind: 'iam', token: iam.accessToken, claims: iamClaims(iam), iam };
}

export function readActiveSession(request: CookieReader): ActiveSession | null {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value || undefined;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value || undefined;
  if (token || refreshToken) {
    return { kind: 'local', token, claims: token ? decodeAccessToken(token) : null, refreshToken };
  }

  const iam = readIamSession(request);
  if (iam && hasAppAccess(iam)) return iamActiveSession(iam);

  return null;
}

/**
 * The session an IAM session picked up by `adoptIamSession` amounts to, or null
 * when the user has no role here. The `login_option` cookie recording it only
 * reaches the browser with the response, so this request reads it from here.
 */
export function activeSessionFromAdoption(request: CookieReader, adopted: AdoptedIamSession): ActiveSession | null {
  const iam: IamSession = {
    option: adopted.option,
    accessToken: adopted.accessToken,
    sessionId: request.cookies.get(iamCookieName(IAM_COOKIES.sessionId, adopted.option))?.value || undefined,
    idToken: undefined,
    token: peekToken(adopted.accessToken),
  };
  return hasAppAccess(iam) ? iamActiveSession(iam) : null;
}

/**
 * Whether this app's own idle clock applies to the session — a local one
 * only. The client idle timer (`useIdleTimer`) reads it through
 * `/api/auth/me`, so it never idles out an IAM session either: that would
 * end the user's whole single sign-on session, the registry's included.
 */
export function isIdleManaged(session: ActiveSession): boolean {
  return session.kind === 'local';
}

/**
 * Whether the session has gone idle by this app's own clock. Only a local
 * session has one; an IAM session's idle timeout is IAM's (see the top of
 * this file). Every entry point that accepts a session cookie calls this —
 * see `isIdleExpired`'s doc comment for why.
 */
export function isSessionIdleExpired(session: ActiveSession | null, request: CookieReader): boolean {
  return session?.kind === 'local' && isIdleExpired(hasSession(session), request);
}

/** Whether an expired access token can still be renewed into a fresh one. */
export function canRenewSession(session: ActiveSession): boolean {
  return session.kind === 'local' ? !!session.refreshToken : canRefreshIamSession(session.iam);
}

/**
 * Whether the request carries a session at all: a decodable access token, or
 * something that can renew one. The input every `isIdleExpired` call takes.
 */
export function hasSession(session: ActiveSession | null): session is ActiveSession {
  return !!session && (!!session.claims || canRenewSession(session));
}

/** The per-session secret rate limits are scoped by (see `buildRateLimitKey`). */
export function sessionRateLimitSecret(session: ActiveSession | null): string | undefined {
  if (!session) return undefined;
  return session.kind === 'local' ? session.refreshToken : session.iam.sessionId;
}

/**
 * The outcome of renewing a session's access token.
 *
 *   renewed     — a usable token; `refreshed` is false when an IAM token
 *                 was still valid and came back unchanged.
 *   ended       — the session is over: clear the session cookies, then
 *                 `apply` (IAM's own clearing cookies, relayed).
 *   unavailable — IAM could not be reached. The session may be fine, so it
 *                 is kept; answer 503 and let the caller retry.
 *
 * `apply` writes the outcome's cookies onto `response`; call it after any
 * other cookie write on it.
 */
export type RenewResult =
  | {
      status: 'renewed';
      accessToken: string;
      claims: AccessTokenClaims | null;
      refreshed: boolean;
      apply(response: NextResponse): void;
    }
  | { status: 'ended'; apply(response: NextResponse): void }
  | { status: 'unavailable' };

const NOTHING_TO_APPLY = () => {};

export async function renewSession(
  request: NextRequest | CookieReader,
  session: ActiveSession,
  clientIp: string
): Promise<RenewResult> {
  if (session.kind === 'local') {
    const result = await performRefresh(request, clientIp);
    if (!result) return { status: 'ended', apply: NOTHING_TO_APPLY };
    return {
      status: 'renewed',
      accessToken: result.pair.access_token,
      claims: decodeAccessToken(result.pair.access_token),
      refreshed: true,
      apply: (response) =>
        setSessionCookies(response, {
          token: result.pair.access_token,
          refreshToken: result.pair.refresh_token,
          rememberMe: result.rememberMe,
        }),
    };
  }

  const renewed = await renewIamSession(session.iam, request, clientIp);
  if (renewed.status === 'unavailable') return renewed;
  if (renewed.status === 'ended') {
    return { status: 'ended', apply: (response) => applyIamCookies(response, renewed.setCookies) };
  }

  // A user whose roles here were withdrawn since sign-in is a guest now.
  const option: LoginOption = renewed.option;
  if (!option.roles?.length) {
    return {
      status: 'ended',
      apply: (response) => {
        applyIamCookies(response, renewed.setCookies);
        setLoginOptionCookie(response, option);
      },
    };
  }

  return {
    status: 'renewed',
    accessToken: renewed.accessToken,
    claims: iamClaims({ ...session.iam, option, accessToken: renewed.accessToken, token: peekToken(renewed.accessToken) }),
    refreshed: renewed.refreshed,
    apply: (response) => {
      applyIamCookies(response, renewed.setCookies);
      setLoginOptionCookie(response, option);
    },
  };
}

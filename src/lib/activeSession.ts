import { applyIamCookies, canRefreshIamSession, readIamSession, refreshIamSession, type IamSession } from '@/lib/iamSession';
import { touchActivityCookie } from '@/lib/idleSession';
import { decodeAccessToken, type AccessTokenClaims } from '@/lib/jwt';
import { AUTH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, setSessionCookies } from '@/lib/session';
import { performRefresh } from '@/lib/sessionRefresh';
import type { NextRequest, NextResponse } from 'next/server';

// The two kinds of session a request can carry, behind one shape so every
// entry point (`/api/proxy/*`, `/api/auth/me`, `/api/auth/refresh`, the
// heartbeat, realtime config) handles both without branching on cookie names:
//
//   local — email/password via oan_auth_service: our own `auth_token` +
//           `refresh_token` cookies (session.ts)
//   iam   — "Sign in as staff" via the OpenG2P IAM service: IAM's own
//           cookies on the shared parent domain (iamSession.ts)
//
// Local wins when a browser somehow holds both: it's the one this app issued.

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

export type ActiveSession =
  | { kind: 'local'; token: string | undefined; claims: AccessTokenClaims | null; refreshToken: string | undefined }
  | { kind: 'iam'; token: string | undefined; claims: AccessTokenClaims | null; iam: IamSession };

export function readActiveSession(request: CookieReader): ActiveSession | null {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value || undefined;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value || undefined;
  if (token || refreshToken) {
    return { kind: 'local', token, claims: token ? decodeAccessToken(token) : null, refreshToken };
  }

  const iam = readIamSession(request);
  if (iam) return { kind: 'iam', token: iam.accessToken, claims: iam.claims, iam };

  return null;
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

export interface RenewedSession {
  accessToken: string;
  claims: AccessTokenClaims | null;
  /** Writes the renewed session's cookies onto `response`. Call after any other cookie write on it. */
  apply(response: NextResponse): void;
}

/** Renews the session's access token, or returns null when the session is over. */
export async function renewSession(
  request: NextRequest | CookieReader,
  session: ActiveSession,
  clientIp: string
): Promise<RenewedSession | null> {
  if (session.kind === 'local') {
    const result = await performRefresh(request, clientIp);
    if (!result) return null;
    return {
      accessToken: result.pair.access_token,
      claims: decodeAccessToken(result.pair.access_token),
      apply: (response) =>
        setSessionCookies(response, {
          token: result.pair.access_token,
          refreshToken: result.pair.refresh_token,
          rememberMe: result.rememberMe,
        }),
    };
  }

  const renewed = await refreshIamSession(session.iam, clientIp);
  if (!renewed) return null;
  return {
    accessToken: renewed.accessToken,
    claims: renewed.claims,
    apply: (response) => {
      // Same as `setSessionCookies` does for a local session: a successful
      // renewal is proof the session is live, so it slides the idle clock.
      touchActivityCookie(response);
      applyIamCookies(response, renewed.setCookies);
    },
  };
}

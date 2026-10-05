import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { env } from '@/lib/env';
import { isIdleExpired } from '@/lib/idleSession';
import { decodeAccessToken, isExpired } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { AUTH_TOKEN_COOKIE, clearSessionCookies, REFRESH_TOKEN_COOKIE, setSessionCookies } from '@/lib/session';
import { performRefresh } from '@/lib/sessionRefresh';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Seconds of life a token must still have to be handed out as-is. The socket
 * checks the token once, at the handshake, so this only needs to cover the
 * time between this response and the handshake landing.
 */
const MIN_TOKEN_LIFETIME_SECONDS = 30;

const NO_STORE = { 'Cache-Control': 'no-store' };

function noSession() {
  const response = NextResponse.json({ message: 'No active session' }, { status: 401, headers: NO_STORE });
  clearSessionCookies(response);
  return response;
}

/**
 * Hands the access token to the realtime client for the socket.io handshake.
 *
 * This is the one deliberate exception to "the token never reaches page
 * script": a browser cannot set headers on a WebSocket, so the AsyncAPI spec
 * has it pass the token as the `access_token` query parameter. The client
 * holds it only long enough to open the socket and never stores it. Every
 * other call still goes through `/api/proxy`, where the token stays in its
 * httpOnly cookie.
 *
 * POST, not GET, so the same-origin CSRF check applies and no cache or
 * prefetch ever holds the response.
 */
export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  let realtime: typeof env.REALTIME;
  try {
    realtime = env.REALTIME;
  } catch (error) {
    logger.error('Realtime is misconfigured:', error);
    realtime = null;
  }
  if (!realtime) {
    return NextResponse.json({ enabled: false }, { headers: NO_STORE });
  }

  const clientIp = getClientIp(request);
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const claims = token ? decodeAccessToken(token) : null;

  const limitKey = buildRateLimitKey('realtime-token', clientIp, { secret: refreshToken });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.realtimeToken.limit, RATE_LIMITS.realtimeToken.windowMs);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  // Same idle rule as every other entry point that accepts a session cookie:
  // a socket must not outlive the session the idle timer already ended.
  if (isIdleExpired(!!claims || !!refreshToken, request)) return noSession();

  const connection = { enabled: true, url: realtime.url, site: realtime.site, path: realtime.path };

  if (token && claims && !isExpired(claims, MIN_TOKEN_LIFETIME_SECONDS)) {
    return NextResponse.json({ ...connection, token }, { headers: NO_STORE });
  }

  try {
    const result = await performRefresh(request, clientIp);
    if (!result) return noSession();

    const response = NextResponse.json({ ...connection, token: result.pair.access_token }, { headers: NO_STORE });
    setSessionCookies(response, {
      token: result.pair.access_token,
      refreshToken: result.pair.refresh_token,
      rememberMe: result.rememberMe,
    });
    return response;
  } catch (error) {
    logger.error('Realtime token refresh error:', error);
    return NextResponse.json({ message: 'No active session' }, { status: 401, headers: NO_STORE });
  }
}

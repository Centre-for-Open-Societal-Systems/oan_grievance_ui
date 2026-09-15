import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { touchActivityCookie } from '@/lib/idleSession';
import { decodeAccessToken } from '@/lib/jwt';
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { AUTH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Called by `useIdleTimer` on real user activity (throttled client-side to
 * roughly once a minute) to slide the idle-session window forward. This is
 * the only thing it does — it does not refresh an expired access token
 * (`/api/auth/me` and the data proxy already do that on demand) — because an
 * idle *keep-alive* has to stay cheap enough to fire on every mouse move
 * without ever itself becoming the bottleneck.
 */
export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const limit = checkRateLimit(`heartbeat:${clientIp}`, RATE_LIMITS.heartbeat.limit, RATE_LIMITS.heartbeat.windowMs);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const hasRefreshToken = !!request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const claims = token ? decodeAccessToken(token) : null;

  // Nothing to keep alive: a merely-expired access token still counts (the
  // refresh token proves there's a real session behind it), only the
  // complete absence of either does not.
  if (!claims && !hasRefreshToken) {
    return NextResponse.json({ message: 'No active session' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  touchActivityCookie(response);
  return response;
}

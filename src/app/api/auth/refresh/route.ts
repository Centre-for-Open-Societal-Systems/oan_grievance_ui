import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { isIdleExpired } from '@/lib/idleSession';
import { logger } from '@/lib/logger';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { canRenewSession, hasSession, readActiveSession, renewSession, sessionRateLimitSecret } from '@/lib/activeSession';
import { clearSessionCookies } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function endSession(message: string, status = 401): NextResponse {
  const response = NextResponse.json({ message }, { status });
  clearSessionCookies(response);
  return response;
}

export async function POST(request: NextRequest) {
  // This route mints a fresh access token from a cookie the browser sends
  // automatically, so without an origin check any site could keep a session
  // warm or force a rotation that logs the real tab out.
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const session = readActiveSession(request);

  // Keyed by IP *and* a hash of the session's own refresh token when one is
  // present — same reasoning as login/route.ts: when clientIp can't be
  // trusted (no reverse proxy configured), every caller collapses to the
  // same "unknown" bucket, and one session hammering this endpoint would
  // otherwise exhaust the budget for every other active session site-wide.
  // A caller with no refresh token at all has no session to scope by and
  // gets a 401 immediately below regardless, so a shared bucket for that
  // case costs little.
  const limitKey = buildRateLimitKey('refresh', clientIp, { secret: sessionRateLimitSecret(session) });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.refresh.limit, RATE_LIMITS.refresh.windowMs);
  if (!limit.allowed) {
    logger.security(`Refresh rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  // A refresh token being technically valid doesn't mean the session is
  // still active — idle timeout must end it too, even though nothing here
  // would otherwise reject the refresh. See `isIdleExpired`'s doc comment for
  // why every session-cookie entry point needs this, not just page loads.
  if (isIdleExpired(hasSession(session), request)) {
    logger.security(`Refresh refused for ${clientIp}: session idle-expired`);
    return endSession(AUTH_MESSAGES.sessionExpiredIdle);
  }

  if (!session || !canRenewSession(session)) return endSession(AUTH_MESSAGES.sessionExpired);

  try {
    const renewed = await renewSession(request, session, clientIp);
    if (!renewed) return endSession(AUTH_MESSAGES.sessionExpired);

    const nextResponse = NextResponse.json({ success: true });
    renewed.apply(nextResponse);
    return nextResponse;
  } catch (error) {
    logger.error('Refresh proxy error:', error);
    return NextResponse.json({ message: AUTH_MESSAGES.sessionExpired }, { status: 500 });
  }
}

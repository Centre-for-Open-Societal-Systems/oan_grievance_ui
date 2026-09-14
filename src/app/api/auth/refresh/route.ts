import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { isIdleExpired } from '@/lib/idleSession';
import { logger } from '@/lib/logger';
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { clearSessionCookies, REFRESH_TOKEN_COOKIE, setSessionCookies } from '@/lib/session';
import { performRefresh } from '@/lib/sessionRefresh';
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
  const limit = checkRateLimit(`refresh:${clientIp}`, RATE_LIMITS.refresh.limit, RATE_LIMITS.refresh.windowMs);
  if (!limit.allowed) {
    logger.security(`Refresh rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  // A refresh token being technically valid doesn't mean the session is
  // still active — idle timeout must end it too, even though nothing here
  // would otherwise reject the refresh. See `isIdleExpired`'s doc comment for
  // why every session-cookie entry point needs this, not just page loads.
  const hasRefreshToken = !!request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (isIdleExpired(hasRefreshToken, request)) {
    logger.security(`Refresh refused for ${clientIp}: session idle-expired`);
    return endSession(AUTH_MESSAGES.sessionExpiredIdle);
  }

  try {
    const result = await performRefresh(request, clientIp);
    if (!result) return endSession(AUTH_MESSAGES.sessionExpired);

    const nextResponse = NextResponse.json({ success: true });
    setSessionCookies(nextResponse, {
      token: result.pair.access_token,
      refreshToken: result.pair.refresh_token,
      rememberMe: result.rememberMe,
    });
    return nextResponse;
  } catch (error) {
    logger.error('Refresh proxy error:', error);
    return NextResponse.json({ message: AUTH_MESSAGES.sessionExpired }, { status: 500 });
  }
}

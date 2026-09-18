import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { callBackendAuth } from '@/lib/oanAuthBackend';
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { clearSessionCookies, REFRESH_TOKEN_COOKIE } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const limit = checkRateLimit(`logout:${clientIp}`, RATE_LIMITS.logout.limit, RATE_LIMITS.logout.windowMs);

  // A tripped limit must never leave someone signed in — clearing our own
  // cookies costs nothing and needs no upstream call, so it happens either way.
  if (!limit.allowed) {
    logger.security(`Logout rate limit exceeded for ${clientIp}; cookies cleared without revoking upstream`);
    const limited = rateLimitedResponse(limit.retryAfterSeconds);
    clearSessionCookies(limited);
    return limited;
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Revoke server-side before dropping the cookies. Clearing cookies alone
  // leaves the refresh token valid until it expires, so anyone who captured
  // it could still redeem it for a live session after "sign out".
  if (refreshToken) {
    try {
      await callBackendAuth('/api/v1/auth/logout', { refresh_token: refreshToken }, clientIp);
    } catch (error) {
      // Best-effort: a backend that's down must not trap someone in a session
      // they asked to leave. The cookies are cleared below regardless.
      logger.error('Refresh token revocation failed:', error);
    }
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}

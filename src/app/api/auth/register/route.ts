import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { BackendAuthError, callBackendAuth, type TokenPair } from '@/lib/oanAuthBackend';
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';

/**
 * Registration issues a token pair too, but this route deliberately discards
 * it and sets no cookies — the UX is "account created, now sign in", not an
 * auto-login. That is unchanged from before this route existed; the point of
 * routing it through here at all is the same protections every credential
 * endpoint gets (CSRF, per-IP rate limit, no backend URL exposed to the browser).
 */
export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const limit = checkRateLimit(`register:${clientIp}`, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
  if (!limit.allowed) {
    logger.security(`Register rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  const body = await request.json().catch(() => ({}));
  const { email, password, full_name, phone_number } = body ?? {};

  if (!email || !password || !full_name || !phone_number) {
    return NextResponse.json({ message: 'Missing required fields in request' }, { status: 400 });
  }

  try {
    await callBackendAuth<TokenPair>('register_user', { email, password, full_name, phone_number }, clientIp);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof BackendAuthError) {
      // Unlike login, the backend's validation message here IS useful to the
      // caller ("email already exists", password complexity) — it does not
      // reveal anything about someone else's account.
      logger.security(`Registration rejected for ${clientIp} with status ${error.status}: ${error.message}`);
      const status = error.status >= 500 ? 502 : 400;
      return NextResponse.json(
        { message: error.status >= 500 ? AUTH_MESSAGES.unexpected : error.message },
        { status }
      );
    }
    logger.error('Register proxy error:', error);
    return NextResponse.json({ message: AUTH_MESSAGES.unexpected }, { status: 500 });
  }
}

import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { BackendAuthError, callBackendAuth, type TokenPair } from '@/lib/oanAuthBackend';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { validatePassword } from '@/lib/validation/password';
import { NextResponse } from 'next/server';

// The form sends the number already combined with a country/dial code (e.g.
// "+251911111111"), unlike `PHONE_NUMBER_REGEX` which validates the bare
// 10-digit local part before that prefix is attached — so this route needs
// its own, looser E.164-shaped check rather than reusing that regex directly.
const E164_PHONE_REGEX = /^\+\d{8,15}$/;

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

  // Pure per-IP limit, checked before the body is even parsed — unlike
  // login (where a fake username achieves nothing for an attacker), a fake
  // *registration* email is exactly what a spam-account flood wants to
  // submit, so scoping the limit by email alone (or IP+email) lets an
  // attacker mint a fresh rate-limit budget on every request just by
  // varying the email — the account-scoped key that's the right call for
  // login would quietly disable flood protection here. This IP-only check
  // is what actually bounds total registration attempts from one source,
  // and running it first also means a flood of malformed/empty bodies still
  // counts against the caller's budget instead of skipping rate-limiting
  // entirely by never reaching a body-shaped check.
  const ipLimit = checkRateLimit(
    buildRateLimitKey('register', clientIp),
    RATE_LIMITS.register.limit,
    RATE_LIMITS.register.windowMs
  );
  if (!ipLimit.allowed) {
    logger.security(`Register rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(ipLimit.retryAfterSeconds);
  }

  const body = await request.json().catch(() => ({}));
  const { email, password, full_name, phone_number } = body ?? {};

  if (!email || !password || !full_name || !phone_number) {
    return NextResponse.json({ message: 'Missing required fields in request' }, { status: 400 });
  }

  // Secondary, tighter limit on IP+email — defense in depth against one
  // specific email being hammered repeatedly (e.g. probing whether it's
  // already registered), on top of the IP-wide flood cap above. When
  // clientIp can't be trusted (no reverse proxy configured), this key
  // collapses toward the IP-only one above rather than replacing it, so the
  // site-wide protection doesn't depend on email uniqueness.
  const emailLimitKey = buildRateLimitKey('register-email', clientIp, { identity: String(email) });
  const emailLimit = checkRateLimit(emailLimitKey, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
  if (!emailLimit.allowed) {
    logger.security(`Register rate limit exceeded for ${clientIp} (email-scoped)`);
    return rateLimitedResponse(emailLimit.retryAfterSeconds);
  }

  // The client already enforces these, but a direct POST here (bypassing the
  // form) must not get a free pass on password strength or phone shape —
  // this must not rely solely on the upstream backend to catch it.
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 });
  }
  if (typeof phone_number !== 'string' || !E164_PHONE_REGEX.test(phone_number)) {
    return NextResponse.json({ message: 'Phone number must be a valid international number.' }, { status: 400 });
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

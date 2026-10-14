import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { readActiveSession, sessionRateLimitSecret } from '@/lib/activeSession';
import { applyIamCookies, revokeIamSession } from '@/lib/iamSession';
import { callBackendAuth } from '@/lib/oanAuthBackend';
import { safeReturnPath } from '@/lib/returnPath';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { clearSessionCookies } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const session = readActiveSession(request);

  // Keyed by IP *and* a hash of the session's own refresh token when one is
  // present — same reasoning as login/refresh: when clientIp can't be
  // trusted, every caller collapses to the same "unknown" bucket, and one
  // session hammering this endpoint would otherwise exhaust the budget for
  // every other active session site-wide.
  const limitKey = buildRateLimitKey('logout', clientIp, { secret: sessionRateLimitSecret(session) });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.logout.limit, RATE_LIMITS.logout.windowMs);

  // A tripped limit must never leave someone signed in — clearing our own
  // cookies costs nothing and needs no upstream call, so it happens either way.
  if (!limit.allowed) {
    logger.security(`Logout rate limit exceeded for ${clientIp}; cookies cleared without revoking upstream`);
    const limited = rateLimitedResponse(limit.retryAfterSeconds);
    clearSessionCookies(limited);
    return limited;
  }

  // Revoke server-side before dropping the cookies. Clearing cookies alone
  // leaves the refresh token valid until it expires, so anyone who captured
  // it could still redeem it for a live session after "sign out".
  if (session?.kind === 'local' && session.refreshToken) {
    try {
      await callBackendAuth('/api/v1/auth/logout', { refresh_token: session.refreshToken }, clientIp);
    } catch (error) {
      // Best-effort: a backend that's down must not trap someone in a session
      // they asked to leave. The cookies are cleared below regardless.
      logger.error('Refresh token revocation failed:', error);
    }
  }

  // A staff session is ended at IAM (it drops the refresh token it holds)
  // and at the identity provider: IAM hands back the provider's logout URL,
  // which the client navigates to — the provider's SSO session lives in the
  // browser, so only the browser can end it. The provider then returns the
  // browser to `returnTo` here (the client's choice of login-page variant),
  // not to IAM's one fixed portal. Best-effort like the local branch:
  // `revokeIamSession` never throws, and without a URL the client just lands
  // locally.
  const body = (await request.json().catch(() => ({}))) as { returnTo?: unknown };
  const returnTo = safeReturnPath(typeof body.returnTo === 'string' ? body.returnTo : null) ?? '/login';
  const iamLogout =
    session?.kind === 'iam'
      ? await revokeIamSession(session.iam, new URL(returnTo, request.url).toString(), clientIp)
      : null;

  const response = NextResponse.json({ success: true, redirectTo: iamLogout?.providerLogoutUrl ?? null });
  clearSessionCookies(response);
  // IAM's own clearing headers carry the exact domain it set the cookies on,
  // so they go last and win over `clearSessionCookies`'s configured guess.
  applyIamCookies(response, iamLogout?.setCookies ?? []);
  return response;
}

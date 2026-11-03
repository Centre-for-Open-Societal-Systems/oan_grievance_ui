import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { readActiveSession, sessionRateLimitSecret } from '@/lib/activeSession';
import { applyIamCookies, expireIamCookies, readIamSession, revokeIamSession } from '@/lib/iamSession';
import { callBackendAuth } from '@/lib/oanAuthBackend';
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

  // An IAM session is ended through oan_auth_service, at IAM (it drops the
  // refresh token it holds) and at the identity provider: server-to-server
  // when the backend can (`providerLoggedOut`), otherwise by handing back the
  // provider's logout URL for the client to navigate to — the provider then
  // returns the browser to the page IAM has configured for it. Best-effort
  // like the local branch: `revokeIamSession` never throws.
  //
  // With no session of this app's, an IAM session it doesn't accept (one with
  // no role here, e.g. registry-only) is ended too: it is what "Sign out and
  // use a different account" on the login page asks to leave, and without
  // this the identity provider would sign the same account straight back in.
  const iamSession = session ? (session.kind === 'iam' ? session.iam : null) : readIamSession(request);
  const iamLogout = iamSession ? await revokeIamSession(iamSession, request, clientIp) : null;

  const response = NextResponse.json({
    success: true,
    redirectTo: iamLogout?.logoutUrl ?? null,
    providerLoggedOut: iamLogout?.providerLoggedOut ?? false,
  });
  clearSessionCookies(response);
  // IAM's own clearing headers carry the exact domain it set the cookies on,
  // so they go last.
  applyIamCookies(response, iamLogout?.setCookies ?? []);
  // IAM sent nothing to clear its cookies (not called, unreachable, or the session already gone):
  // drop what this browser holds so the next page load cannot re-adopt the same session.
  if (!iamLogout?.setCookies.length) expireIamCookies(response, request);
  return response;
}

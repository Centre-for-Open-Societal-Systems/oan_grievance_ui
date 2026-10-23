import { getClientIp } from '@/lib/clientIp';
import { startIamLogin } from '@/lib/iamSession';
import { logger } from '@/lib/logger';
import { buildRateLimitKey, checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { safeReturnPath } from '@/lib/returnPath';
import { setLoginOptionCookie } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const REASONS = {
  not_offered: 'login_not_offered',
  failed: 'login_failed',
  unavailable: 'login_unavailable',
} as const;

function backToLogin(request: NextRequest, reason: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?reason=${reason}`, request.url), 303);
}

/**
 * Starts an IAM login option (`?key=` from `/api/v1/auth/iam/providers`). A
 * login page button navigates here (a page load, not a fetch — the browser
 * has to follow the identity provider's redirects).
 *
 * oan_auth_service opens the login transaction at the option's IAM and answers
 * the identity provider URL plus the option's cookie prefix, recorded in
 * `login_option` before the browser leaves. After the login, IAM sends the
 * browser to `/api/auth/iam/complete`.
 */
export async function GET(request: NextRequest) {
  const key =
    request.nextUrl.searchParams.get('key') ??
    request.nextUrl.searchParams.get('role') ??
    request.nextUrl.searchParams.get('type') ??
    request.nextUrl.searchParams.get('portal');
  if (!key) return backToLogin(request, REASONS.not_offered);

  const clientIp = getClientIp(request);
  const limitKey = buildRateLimitKey('iam-login', clientIp);
  const limit = checkRateLimit(limitKey, RATE_LIMITS.iamLogin.limit, RATE_LIMITS.iamLogin.windowMs);
  if (!limit.allowed) {
    logger.security(`IAM login rate limit exceeded for ${clientIp}`);
    return backToLogin(request, REASONS.unavailable);
  }

  // IAM redirects the browser to this URL once the login is done, as given —
  // so it must be absolute (a bare path would resolve against IAM's own host),
  // and its origin must be in the option's `return_origins` in
  // oan_auth_service. The page to land on rides along as `returnUrl`,
  // sanitised here and again on arrival.
  const landing = new URL('/api/auth/iam/complete', request.url);
  const returnPath = safeReturnPath(request.nextUrl.searchParams.get('returnUrl'));
  if (returnPath) landing.searchParams.set('returnUrl', returnPath);

  const started = await startIamLogin(key, landing.toString(), clientIp);
  if (!started.ok) return backToLogin(request, REASONS[started.reason]);

  const response = NextResponse.redirect(started.redirectUrl, 303);
  setLoginOptionCookie(response, started.option);
  return response;
}

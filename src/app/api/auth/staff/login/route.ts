import { getClientIp } from '@/lib/clientIp';
import { iamConfig, startIamLogin } from '@/lib/iamSession';
import { logger } from '@/lib/logger';
import { buildRateLimitKey, checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { safeReturnPath } from '@/lib/returnPath';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function backToLogin(request: NextRequest, reason: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?reason=${reason}`, request.url), 303);
}

/**
 * "Sign in as staff": the login form's button navigates here (a page load,
 * not a fetch — the browser has to follow the identity provider's redirects).
 *
 * Opens a login transaction at IAM server-to-server and sends the browser to
 * the identity provider's login page. After the login the browser comes back
 * to `/api/auth/staff/complete`, which turns IAM's cookies into a session here.
 */
export async function GET(request: NextRequest) {
  if (!iamConfig()) return backToLogin(request, 'staff_unavailable');

  const clientIp = getClientIp(request);
  const limitKey = buildRateLimitKey('staff-login', clientIp);
  const limit = checkRateLimit(limitKey, RATE_LIMITS.staffLogin.limit, RATE_LIMITS.staffLogin.windowMs);
  if (!limit.allowed) {
    logger.security(`Staff login rate limit exceeded for ${clientIp}`);
    return backToLogin(request, 'staff_unavailable');
  }

  // IAM redirects the browser to this URL once the login is done, without
  // checking it — so it must be absolute (a bare path would resolve against
  // IAM's own host) and must point back at this app. The page to land on
  // rides along as `returnUrl`, sanitised here and again on arrival.
  const landing = new URL('/api/auth/staff/complete', request.url);
  const returnPath = safeReturnPath(request.nextUrl.searchParams.get('returnUrl'));
  if (returnPath) landing.searchParams.set('returnUrl', returnPath);

  const providerUrl = await startIamLogin(landing.toString(), clientIp);
  if (!providerUrl) return backToLogin(request, 'staff_unavailable');

  return NextResponse.redirect(providerUrl, 303);
}

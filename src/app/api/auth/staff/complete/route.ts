import { homeRouteForRoles } from '@/features/auth/rbac';
import { hasAppAccess } from '@/lib/activeSession';
import { iamConfig, readIamSession } from '@/lib/iamSession';
import { touchActivityCookie } from '@/lib/idleSession';
import { safeReturnPath } from '@/lib/returnPath';
import { clearLocalSessionCookies } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function backToLogin(request: NextRequest, reason: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?reason=${reason}`, request.url), 303);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Where staff sign-in lands once IAM has opened the session: the URL
 * `/api/auth/staff/login` gave IAM as its post-login redirect. IAM's cookies
 * (shared parent domain) arrive with this request — set either by IAM's own
 * callback or relayed by `/api/auth/staff/callback` — and this turns them
 * into a session here: it starts the idle clock and drops any local session
 * the browser still held, so `readActiveSession` (which prefers local) can't
 * mix the two up.
 *
 * Answers with a tiny page that navigates on, not a 30x: the redirect chain
 * that got here started at the identity provider, and a browser withholds
 * `SameSite=Strict` cookies — this app's idle-clock cookie among them — on
 * every hop of a chain that started cross-site. A navigation this page starts
 * itself is same-site, so the idle cookie set below is sent with it.
 */
export async function GET(request: NextRequest) {
  const config = iamConfig();
  if (!config) return backToLogin(request, 'staff_unavailable');

  const session = readIamSession(request);
  if (!session?.claims) return backToLogin(request, 'staff_failed');
  // Signed in at IAM, but not provisioned for this app — see `hasAppAccess`.
  // Their session is left alone: it is still valid for the apps it is for.
  if (!hasAppAccess(session)) return backToLogin(request, 'staff_no_access');

  const target =
    safeReturnPath(request.nextUrl.searchParams.get('returnUrl')) ?? homeRouteForRoles(session.claims.roles);
  const href = escapeHtml(target);

  const response = new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${href}"><title>Signing in</title></head><body><a href="${href}">Continue</a></body></html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      },
    }
  );
  clearLocalSessionCookies(response);
  touchActivityCookie(response);
  return response;
}

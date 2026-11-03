import { AUTH_MESSAGES } from '@/lib/authMessages';
import { checkCsrf } from '@/lib/csrf';
import { getClientIp } from '@/lib/clientIp';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { buildClientResponse, buildUpstreamHeaders } from '@/lib/proxyHeaders';
import {
  canRenewSession,
  isSessionIdleExpired,
  readActiveSession,
  renewSession,
  type RenewResult,
} from '@/lib/activeSession';
import { isExpired } from '@/lib/jwt';
import { clearIdleSessionCookies, clearSessionCookies } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ path: string[] }> };

function sessionEnded(apply: (response: NextResponse) => void): NextResponse {
  const ended = NextResponse.json({ message: AUTH_MESSAGES.sessionExpired }, { status: 401 });
  clearSessionCookies(ended);
  apply(ended);
  return ended;
}

/** IAM unreachable while renewing: the session may be fine, so nothing is cleared. */
function iamUnavailable(): NextResponse {
  return NextResponse.json({ message: AUTH_MESSAGES.signInUnavailable }, { status: 503 });
}

async function handler(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return handleProxy(request, path);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };

async function handleProxy(request: NextRequest, pathArray: string[]) {
  const isMutating = !['GET', 'HEAD'].includes(request.method);

  if (isMutating) {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;
  }

  const session = readActiveSession(request);
  let authToken = session?.token;

  // `proxy.ts` excludes `/api/*` from its matcher (a redirect response makes
  // no sense for an XHR/fetch call), which makes this the only idle-expiry
  // check every real data call in the app actually goes through. Skipping it
  // here would mean the idle timeout only ever fired on a full page
  // navigation — never on the fetches this SPA makes while sitting on one.
  if (isSessionIdleExpired(session, request)) {
    const response = NextResponse.json({ message: AUTH_MESSAGES.sessionExpiredIdle }, { status: 401 });
    clearIdleSessionCookies(response);
    return response;
  }

  const targetPath = pathArray.join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${env.AUTH_API_BASE_URL}/${targetPath}${search}`;

  // Read the body once — it can't be re-read from `request` a second time,
  // and a 401 retry below reuses this same payload against the backend.
  const requestBody = isMutating ? await request.blob() : undefined;

  try {
    // An IAM token is renewed *before* the call when it has visibly expired:
    // the backend caches its verdict per token until `exp`, so an expired one
    // is a guaranteed 401 round trip. A local token is left to the
    // 401-then-retry below, unchanged.
    let renewedEarly: RenewResult | null = null;
    if (session?.kind === 'iam' && session.claims && isExpired(session.claims) && canRenewSession(session)) {
      renewedEarly = await renewSession(request, session, getClientIp(request));
      if (renewedEarly.status === 'unavailable') return iamUnavailable();
      if (renewedEarly.status === 'ended') return sessionEnded(renewedEarly.apply);
      authToken = renewedEarly.accessToken;
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: buildUpstreamHeaders(request, authToken),
      redirect: 'manual',
      body: requestBody,
    });

    // Mirrors the refresh-then-retry `/api/auth/me` does inline: an expired
    // access token is the common case (15-minute lifetime vs. a session-long
    // cookie), not a real sign-out, so every proxied call gets one silent
    // retry on a fresh token before the caller ever sees a 401. A 503 is
    // passed through as is: it means IAM is down, not that the session ended.
    if (response.status === 401 && !renewedEarly && session && canRenewSession(session)) {
      const refreshed = await renewSession(request, session, getClientIp(request));
      if (refreshed.status === 'unavailable') return iamUnavailable();

      // An IAM token that comes back unchanged was never expired — the 401
      // is the backend's real answer, and retrying with the same token can't
      // change it.
      if (refreshed.status === 'renewed' && refreshed.refreshed && refreshed.accessToken !== authToken) {
        const retryResponse = await fetch(targetUrl, {
          method: request.method,
          headers: buildUpstreamHeaders(request, refreshed.accessToken),
          redirect: 'manual',
          body: requestBody,
        });

        const { body, init } = await buildClientResponse(retryResponse, targetUrl, { proxyPrefix: '/api/proxy' });
        const nextResponse = new NextResponse(body, init);
        refreshed.apply(nextResponse);
        return nextResponse;
      }
    }

    const { body, init } = await buildClientResponse(response, targetUrl, { proxyPrefix: '/api/proxy' });
    const nextResponse = new NextResponse(body, init);
    if (renewedEarly?.status === 'renewed') renewedEarly.apply(nextResponse);
    return nextResponse;
  } catch (error) {
    logger.error(`Proxy error for ${targetUrl}:`, error);
    return NextResponse.json({ message: 'Proxy request failed' }, { status: 502 });
  }
}

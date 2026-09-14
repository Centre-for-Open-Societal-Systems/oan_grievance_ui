import { checkCsrf } from '@/lib/csrf';
import { getClientIp } from '@/lib/clientIp';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { buildClientResponse, buildUpstreamHeaders } from '@/lib/proxyHeaders';
import { AUTH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, setSessionCookies } from '@/lib/session';
import { performRefresh } from '@/lib/sessionRefresh';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ path: string[] }> };

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

  const targetPath = pathArray.join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${env.AUTH_API_BASE_URL}/${targetPath}${search}`;

  const authToken = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  // Read the body once — it can't be re-read from `request` a second time,
  // and a 401 retry below reuses this same payload against the backend.
  const requestBody = isMutating ? await request.blob() : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: buildUpstreamHeaders(request, authToken),
      redirect: 'manual',
      body: requestBody,
    });

    // Mirrors the refresh-then-retry `/api/auth/me` does inline: an expired
    // access token is the common case (15-minute lifetime vs. a session-long
    // cookie), not a real sign-out, so every proxied call gets one silent
    // retry on a fresh token before the caller ever sees a 401.
    if (response.status === 401 && request.cookies.get(REFRESH_TOKEN_COOKIE)?.value) {
      const clientIp = getClientIp(request);
      const refreshed = await performRefresh(request, clientIp);

      if (refreshed) {
        const retryResponse = await fetch(targetUrl, {
          method: request.method,
          headers: buildUpstreamHeaders(request, refreshed.pair.access_token),
          redirect: 'manual',
          body: requestBody,
        });

        const { body, init } = await buildClientResponse(retryResponse, targetUrl, { proxyPrefix: '/api/proxy' });
        const nextResponse = new NextResponse(body, init);
        setSessionCookies(nextResponse, {
          token: refreshed.pair.access_token,
          refreshToken: refreshed.pair.refresh_token,
          rememberMe: refreshed.rememberMe,
        });
        return nextResponse;
      }
    }

    const { body, init } = await buildClientResponse(response, targetUrl, { proxyPrefix: '/api/proxy' });
    return new NextResponse(body, init);
  } catch (error) {
    logger.error(`Proxy error for ${targetUrl}:`, error);
    return NextResponse.json({ message: 'Proxy request failed' }, { status: 502 });
  }
}

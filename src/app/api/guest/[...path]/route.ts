import { checkCsrf } from '@/lib/csrf';
import { backendUrl } from '@/lib/env';
import { logger } from '@/lib/logger';
import { buildClientResponse, buildUpstreamHeaders } from '@/lib/proxyHeaders';
import { REQUEST_ID_HEADER, requestIdFrom } from '@/lib/requestId';
import { NextRequest, NextResponse } from 'next/server';

/**
 * The backend-for-frontend of a sensitive anonymous case opened by its link and PIN (STG-518).
 *
 * One read-only, stateless call: the page posts the ticket, the link's token and the PIN, and the
 * backend answers with that one case. Nothing here carries the signed-in user's session, and
 * nothing is kept between calls (no cookie): the page holds the token and PIN in memory and sends
 * them again to refresh. Any other path answers 404 without reaching the backend.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

const ROUTES: Record<string, { method: 'POST'; upstream: string }> = {
  grievance: { method: 'POST', upstream: 'api/v1/guest/grievance' },
};

function secure(response: NextResponse): NextResponse {
  // The page's link carried a secret in its fragment; nothing here should say where it came from.
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function handler(request: NextRequest, { params }: RouteContext) {
  const { path: segments } = await params;
  const route = ROUTES[segments.join('/')];
  if (!route || route.method !== request.method) {
    return secure(NextResponse.json({ message: 'Not found' }, { status: 404 }));
  }

  const csrfError = checkCsrf(request);
  if (csrfError) return secure(csrfError);

  const requestId = requestIdFrom(request.headers);
  const targetUrl = backendUrl(route.upstream);
  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: buildUpstreamHeaders(request, undefined, requestId),
      redirect: 'manual',
      body: await request.blob(),
    });
  } catch (error) {
    logger.event('error', {
      event: 'guest_proxy.failed',
      source: 'server',
      requestId,
      method: request.method,
      path: '/api/guest/grievance',
      error,
    });
    return secure(NextResponse.json({ message: 'Request failed' }, { status: 502 }));
  }

  const { body, init } = await buildClientResponse(upstream, targetUrl);
  const response = new NextResponse(body, init);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return secure(response);
}

export { handler as GET, handler as POST };

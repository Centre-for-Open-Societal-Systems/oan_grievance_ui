import { checkCsrf } from '@/lib/csrf';
import { backendUrl } from '@/lib/env';
import {
  clearGuestSessionCookie,
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_HEADER,
  setGuestSessionCookie,
} from '@/lib/guestSession';
import { logger } from '@/lib/logger';
import { buildClientResponse, buildUpstreamHeaders } from '@/lib/proxyHeaders';
import { REQUEST_ID_HEADER, requestIdFrom } from '@/lib/requestId';
import { NextRequest, NextResponse } from 'next/server';

/**
 * The backend-for-frontend of a sensitive anonymous case opened by its link and PIN (STG-518).
 *
 * Unlike `/api/proxy`, nothing here carries the signed-in user's session: the credential is the
 * link's token and the PIN, then the guest session `verify` opens, which lives only in an
 * httpOnly cookie and travels upstream in its own header. Only the paths below are relayed;
 * anything else answers 404 without reaching the backend.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

interface GuestRoute {
  method: 'GET' | 'POST';
  pattern: RegExp;
  upstream: (match: RegExpMatchArray) => string;
}

const ATTACHMENT_ID = '([A-Za-z0-9._-]{1,140})';

const ROUTES: GuestRoute[] = [
  { method: 'POST', pattern: /^verify$/, upstream: () => 'api/v1/guest-access/verify' },
  { method: 'GET', pattern: /^session$/, upstream: () => 'api/v1/guest-access/session' },
  { method: 'POST', pattern: /^logout$/, upstream: () => 'api/v1/guest-access/logout' },
  { method: 'GET', pattern: /^grievance$/, upstream: () => 'api/v1/guest/grievance' },
  { method: 'POST', pattern: /^grievance\/message$/, upstream: () => 'api/v1/guest/grievance/message' },
  { method: 'GET', pattern: /^grievance\/attachments$/, upstream: () => 'api/v1/guest/grievance/attachments' },
  {
    method: 'GET',
    pattern: new RegExp(`^grievance/attachments/${ATTACHMENT_ID}/(view|download)$`),
    upstream: (m) => `api/v1/guest/grievance/attachments/${encodeURIComponent(m[1]!)}/${m[2]}`,
  },
];

/** Query parameters relayed per path; any other parameter is dropped. */
const ALLOWED_QUERY: Record<string, readonly string[]> = {
  grievance: ['cursor', 'limit'],
};

/** Upstream answers after which the session is over and the cookie goes. */
const SESSION_OVER_CODES = new Set(['GUEST_SESSION_EXPIRED', 'GUEST_ACCESS_CLOSED']);

function notFound(): NextResponse {
  return NextResponse.json({ message: 'Not found' }, { status: 404 });
}

function secure(response: NextResponse): NextResponse {
  // The page's link carried a secret in its fragment; nothing here should say where it came from.
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function upstreamQuery(request: NextRequest, path: string): string {
  const allowed = ALLOWED_QUERY[path] ?? [];
  const params = new URLSearchParams();
  for (const key of allowed) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function handler(request: NextRequest, { params }: RouteContext) {
  const { path: segments } = await params;
  const path = segments.join('/');
  const route = ROUTES.find((r) => r.method === request.method && r.pattern.test(path));
  if (!route) return secure(notFound());

  if (request.method !== 'GET') {
    const csrfError = checkCsrf(request);
    if (csrfError) return secure(csrfError);
  }

  const requestId = requestIdFrom(request.headers);
  const targetUrl = `${backendUrl(route.upstream(path.match(route.pattern)!))}${upstreamQuery(request, path)}`;
  const headers = buildUpstreamHeaders(request, undefined, requestId);
  const session = request.cookies.get(GUEST_SESSION_COOKIE)?.value;
  if (session) headers.set(GUEST_SESSION_HEADER, session);

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      redirect: 'manual',
      body: request.method === 'GET' ? undefined : await request.blob(),
    });
  } catch (error) {
    logger.event('error', {
      event: 'guest_proxy.failed',
      source: 'server',
      requestId,
      method: request.method,
      path: `/api/guest/${route.pattern.source}`,
      error,
    });
    return secure(NextResponse.json({ message: 'Request failed' }, { status: 502 }));
  }

  if (path === 'verify') return secure(await verified(upstream, targetUrl, requestId));

  // Read before the body is relayed: relaying consumes it.
  const over = path === 'logout' || (await sessionIsOver(upstream));
  const { body, init } = await buildClientResponse(upstream, targetUrl);
  const response = new NextResponse(body, init);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  if (over) clearGuestSessionCookie(response);
  return secure(response);
}

/** Keeps the session token from `verify` in the cookie and out of what the browser receives. */
async function verified(upstream: Response, targetUrl: string, requestId: string): Promise<NextResponse> {
  const { body, init } = await buildClientResponse(upstream, targetUrl);
  if (!upstream.ok) {
    const response = new NextResponse(body, init);
    response.headers.set(REQUEST_ID_HEADER, requestId);
    clearGuestSessionCookie(response);
    return response;
  }

  let payload: { data?: { session_token?: string; expires_at?: string | null } & Record<string, unknown> } & Record<
    string,
    unknown
  >;
  try {
    payload = JSON.parse(typeof body === 'string' ? body : await new Response(body).text());
  } catch {
    return NextResponse.json({ message: 'The server returned an unexpected response.' }, { status: 502 });
  }
  const token = payload.data?.session_token;
  if (!token) {
    return NextResponse.json({ message: 'The server returned an unexpected response.' }, { status: 502 });
  }
  const { session_token: _token, ...data } = payload.data!;
  const response = NextResponse.json({ ...payload, data }, { status: upstream.status });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  setGuestSessionCookie(response, token, data.expires_at as string | null | undefined);
  return response;
}

/** Whether the backend said the session has ended (expired, or its case closed). Reads a clone. */
async function sessionIsOver(upstream: Response): Promise<boolean> {
  if (upstream.status !== 401 && upstream.status !== 410) return false;
  try {
    const payload = (await upstream.clone().json()) as { code?: string };
    return SESSION_OVER_CODES.has(payload.code ?? '');
  } catch {
    return false;
  }
}

export { handler as GET, handler as POST };

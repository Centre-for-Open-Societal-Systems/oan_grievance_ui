import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { backendUrl } from '@/lib/env';
import { logger } from '@/lib/logger';
import { buildClientResponse, buildUpstreamHeaders } from '@/lib/proxyHeaders';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { REQUEST_ID_HEADER, requestIdFrom } from '@/lib/requestId';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * The backend-for-frontend of a sensitive anonymous case opened by its link and PIN (STG-518).
 *
 * One read-only, stateless call: the page posts the ticket, the link's token and the PIN, and the
 * backend answers with that one case. Nothing here carries the signed-in user's session, and
 * nothing is kept between calls (no cookie): the page holds the token and PIN in memory and sends
 * them again to refresh. Any other path answers 404 without reaching the backend.
 *
 * The body is parsed here before it goes anywhere (AGENTS.md §7): capped, checked against the
 * schema below, and rebuilt from what passed, so only these three fields reach the backend.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

const UPSTREAM = 'api/v1/guest/grievance';

// The three short fields below fit in a few hundred bytes; anything much larger is not a view.
const MAX_BODY_BYTES = 1_024;

// The same bounds the backend's request schema holds.
const guestViewSchema = z.object({
  ticket_number: z.string().trim().min(1).max(32),
  token: z.string().trim().min(1).max(64),
  pin: z.string().trim().min(1).max(12),
});

function secure(response: NextResponse): NextResponse {
  // The page's link carried a secret in its fragment; nothing here should say where it came from.
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function rejected(status: number, message: string): NextResponse {
  return secure(NextResponse.json({ message }, { status }));
}

/**
 * The body as text, or null once it passes `MAX_BODY_BYTES`. Reads in chunks and stops at the
 * cap, so an oversized body is never buffered whole (as `/api/client-logs` does).
 */
async function readCappedBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  if (path.join('/') !== 'grievance') return rejected(404, 'Not found');

  const csrfError = checkCsrf(request);
  if (csrfError) return secure(csrfError);

  const raw = await readCappedBody(request);
  if (raw === null) return rejected(413, 'Request too large');
  let parsed: z.infer<typeof guestViewSchema>;
  try {
    parsed = guestViewSchema.parse(JSON.parse(raw));
  } catch {
    return rejected(400, 'Invalid request');
  }

  const clientIp = getClientIp(request);
  const limitKey = buildRateLimitKey('guest_view', clientIp, { identity: parsed.ticket_number.replace(/-/g, '') });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.guestView.limit, RATE_LIMITS.guestView.windowMs);
  if (!limit.allowed) return secure(rateLimitedResponse(limit.retryAfterSeconds));

  const requestId = requestIdFrom(request.headers);
  const targetUrl = backendUrl(UPSTREAM);
  const headers = buildUpstreamHeaders(request, undefined, requestId);
  headers.set('Content-Type', 'application/json');
  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: 'POST',
      headers,
      redirect: 'manual',
      body: JSON.stringify(parsed),
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
    return rejected(502, 'Request failed');
  }

  const { body, init } = await buildClientResponse(upstream, targetUrl);
  const response = new NextResponse(body, init);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return secure(response);
}

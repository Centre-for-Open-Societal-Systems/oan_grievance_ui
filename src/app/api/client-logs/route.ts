import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { isValidRequestId } from '@/lib/requestId';
import { readActiveSession, sessionRateLimitSecret } from '@/lib/activeSession';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

// Receives the failure reports `clientLogger.ts` sends from the browser and
// writes them through the server `logger`, so client and server problems land
// in one stream with one shape. Reachable without a session on purpose: the
// login page can fail to render too. The browser only ever supplies a name
// from a fixed list and short bounded fields (never free text), and the logger
// redacts again. Anyone can post here, so the line is written with
// `unverified: true`: it says what a browser claimed, not what happened.

const MAX_BODY_BYTES = 4_096;

/**
 * The body as text, or null once it passes `MAX_BODY_BYTES` *bytes*. Reads in
 * chunks and stops at the cap, so an oversized upload is never buffered whole.
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

const clientEventSchema = z.object({
  event: z.enum(['api.request_failed', 'render.error', 'window.error', 'window.unhandled_rejection', 'flow.failed']),
  requestId: z.string().refine(isValidRequestId).optional(),
  flow: z.string().max(60).optional(),
  status: z.number().int().min(0).max(599).optional(),
  method: z.string().max(10).optional(),
  path: z.string().max(300).optional(),
  errorName: z.string().regex(/^[A-Za-z][A-Za-z0-9_$]{0,39}$/).optional(),
  location: z.string().max(300).optional(),
  page: z.string().max(300).optional(),
});

export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const limit = checkRateLimit(buildRateLimitKey('client-logs', clientIp, { secret: sessionRateLimitSecret(readActiveSession(request)) }), RATE_LIMITS.clientLog.limit, RATE_LIMITS.clientLog.windowMs);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  const raw = await readCappedBody(request).catch(() => '');
  if (raw === null) {
    return NextResponse.json({ message: 'Report too large' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: 'Invalid report' }, { status: 400 });
  }

  const parsed = clientEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid report' }, { status: 400 });
  }

  logger.event('error', { ...parsed.data, source: 'client', unverified: true });
  return new NextResponse(null, { status: 204 });
}

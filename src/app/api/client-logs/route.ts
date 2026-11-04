import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { isValidRequestId } from '@/lib/requestId';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Receives the failure reports `clientLogger.ts` sends from the browser and
// writes them through the server `logger`, so client and server problems land
// in one stream with one shape. Reachable without a session on purpose: the
// login page can fail to render too. The browser only ever supplies a name
// from a fixed list and short bounded text, and the logger redacts again.

const MAX_BODY_BYTES = 4_096;

const clientEventSchema = z.object({
  event: z.enum(['api.request_failed', 'render.error', 'window.error', 'window.unhandled_rejection', 'flow.failed']),
  requestId: z.string().refine(isValidRequestId).optional(),
  flow: z.string().max(60).optional(),
  status: z.number().int().min(0).max(599).optional(),
  method: z.string().max(10).optional(),
  path: z.string().max(300).optional(),
  message: z.string().max(500).optional(),
  page: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const limit = checkRateLimit(buildRateLimitKey('client-logs', clientIp), RATE_LIMITS.clientLog.limit, RATE_LIMITS.clientLog.windowMs);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  const raw = await request.text().catch(() => '');
  if (raw.length > MAX_BODY_BYTES) {
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

  logger.event('error', { ...parsed.data, source: 'client' });
  return new NextResponse(null, { status: 204 });
}

import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { env } from '@/lib/env';
import { isExpired } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { isSessionIdleExpired, readActiveSession, renewSession, sessionRateLimitSecret } from '@/lib/activeSession';
import { clearIdleSessionCookies, clearSessionCookies } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const MIN_TOKEN_LIFETIME_SECONDS = 30;
const NO_STORE = { 'Cache-Control': 'no-store' };

function noSession() {
  const response = NextResponse.json({ message: 'No active session' }, { status: 401, headers: NO_STORE });
  clearSessionCookies(response);
  return response;
}

export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  let realtime: typeof env.REALTIME;
  try {
    realtime = env.REALTIME;
  } catch (error) {
    logger.error('Realtime is misconfigured:', error);
    realtime = null;
  }
  if (!realtime) {
    return NextResponse.json({ enabled: false }, { headers: NO_STORE });
  }

  const clientIp = getClientIp(request);
  const session = readActiveSession(request);

  const limitKey = buildRateLimitKey('realtime-config', clientIp, { secret: sessionRateLimitSecret(session) });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.realtimeConfig.limit, RATE_LIMITS.realtimeConfig.windowMs);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  if (isSessionIdleExpired(session, request)) {
    const response = NextResponse.json({ message: 'No active session' }, { status: 401, headers: NO_STORE });
    clearIdleSessionCookies(response);
    return response;
  }
  if (!session) return noSession();

  const connection = { enabled: true, url: realtime.url, site: realtime.site, path: realtime.path };

  if (session.claims && !isExpired(session.claims, MIN_TOKEN_LIFETIME_SECONDS)) {
    return NextResponse.json(connection, { headers: NO_STORE });
  }

  try {
    const renewed = await renewSession(request, session, clientIp);
    if (!renewed) return noSession();

    const response = NextResponse.json(connection, { headers: NO_STORE });
    renewed.apply(response);
    return response;
  } catch (error) {
    logger.error('Realtime config refresh error:', error);
    return NextResponse.json({ message: 'No active session' }, { status: 401, headers: NO_STORE });
  }
}

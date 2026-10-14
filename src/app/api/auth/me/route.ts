import { isIdleManaged, isSessionIdleExpired, readActiveSession, renewSession } from '@/lib/activeSession';
import { getClientIp } from '@/lib/clientIp';
import { isExpired } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { clearIdleSessionCookies, clearSessionCookies } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function noSession(): NextResponse {
  const response = NextResponse.json({ message: 'No active session' }, { status: 401 });
  clearSessionCookies(response);
  return response;
}

/**
 * The session-restore probe AuthBootstrapGate calls on mount.
 *
 * Reads claims out of the access-token cookie itself, refreshing first if it's
 * expired (the cookie carries the *session* lifetime, not the 15-minute
 * access-token lifetime, so an expired access token with a live refresh token
 * is the common case, not an edge case). Works the same for a local session
 * and a staff (IAM) one — see `activeSession.ts`. `idleManaged` tells the
 * client idle timer (`useIdleTimer`) whether this app's idle clock applies:
 * it does not for an IAM session, whose idle timeout is Keycloak's.
 */
export async function GET(request: NextRequest) {
  const session = readActiveSession(request);

  // proxy.ts excludes /api/* from its matcher, so this is the only place
  // a page that restores its session via this route ever gets checked for
  // idle expiry — a stale-but-technically-valid token pair must not restore
  // a session the user was actually idled out of.
  if (isSessionIdleExpired(session, request)) {
    const response = NextResponse.json({ message: 'No active session' }, { status: 401 });
    clearIdleSessionCookies(response);
    return response;
  }
  if (!session) return NextResponse.json({ message: 'No active session' }, { status: 401 });

  if (session.claims && !isExpired(session.claims)) {
    return NextResponse.json({ email: session.claims.sub, roles: session.claims.roles, idleManaged: isIdleManaged(session) });
  }

  try {
    const renewed = await renewSession(request, session, getClientIp(request));
    if (!renewed) return noSession();

    if (!renewed.claims) {
      logger.error('Refreshed access token did not decode as a valid JWT');
      return noSession();
    }

    const response = NextResponse.json({
      email: renewed.claims.sub,
      roles: renewed.claims.roles,
      idleManaged: isIdleManaged(session),
    });
    renewed.apply(response);
    return response;
  } catch (error) {
    logger.error('Session restore error:', error);
    return NextResponse.json({ message: 'No active session' }, { status: 401 });
  }
}

import { getClientIp } from '@/lib/clientIp';
import { env } from '@/lib/env';
import { isIdleExpired } from '@/lib/idleSession';
import { decodeAccessToken, isExpired } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { AUTH_TOKEN_COOKIE, clearSessionCookies, REFRESH_TOKEN_COOKIE, setSessionCookies } from '@/lib/session';
import { performRefresh } from '@/lib/sessionRefresh';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

async function fetchBackendMe(accessToken: string) {
  try {
    const res = await fetch(`${env.AUTH_API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const json = await res.json();
      const d = json?.data;
      if (d) {
        const grievanceProfile = d.profiles?.grievance;
        return {
          email: d.login_email || d.user || '',
          roles: d.roles || [],
          full_name: d.full_name || grievanceProfile?.full_name || d.login_email || d.user || 'User',
          first_name: d.first_name || undefined,
          last_name: d.last_name || undefined,
          mobile_no: d.mobile_no || grievanceProfile?.contact_mobile || undefined,
          type: grievanceProfile?.type || d.roles?.[0] || 'Grievance Submitter',
          profile_id: grievanceProfile?.profile_id || undefined,
          fayda_id: grievanceProfile?.fayda_id || undefined,
          administrative_area: grievanceProfile?.administrative_area || undefined,
          administrative_unit: grievanceProfile?.administrative_unit || undefined,
          preferred_language: grievanceProfile?.preferred_language || undefined,
        };
      }
    }
  } catch (err) {
    logger.error('Failed to fetch rich profile from backend /api/v1/auth/me:', err);
  }
  return null;
}

/**
 * The session-restore probe AuthBootstrapGate calls on mount.
 *
 * Restores session from backend /api/v1/auth/me, refreshing first if expired,
 * extracting only needed user identity and profile info while dropping claims/meta.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const hasRefreshToken = !!request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const claims = token ? decodeAccessToken(token) : null;

  // proxy.ts excludes /api/* from its matcher, so this is the only place
  // a page that restores its session via this route ever gets checked for
  // idle expiry — a stale-but-technically-valid token pair must not restore
  // a session the user was actually idled out of.
  if (isIdleExpired(!!claims || hasRefreshToken, request)) {
    const response = NextResponse.json({ message: 'No active session' }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  if (token && claims && !isExpired(claims)) {
    const richUser = await fetchBackendMe(token);
    return NextResponse.json(richUser || { email: claims.sub, roles: claims.roles });
  }

  try {
    const clientIp = getClientIp(request);
    const result = await performRefresh(request, clientIp);
    if (!result) {
      const response = NextResponse.json({ message: 'No active session' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    const refreshedClaims = decodeAccessToken(result.pair.access_token);
    if (!refreshedClaims) {
      logger.error('Refreshed access token did not decode as a valid JWT');
      const response = NextResponse.json({ message: 'No active session' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    const richUser = await fetchBackendMe(result.pair.access_token);
    const response = NextResponse.json(richUser || { email: refreshedClaims.sub, roles: refreshedClaims.roles });
    setSessionCookies(response, {
      token: result.pair.access_token,
      refreshToken: result.pair.refresh_token,
      rememberMe: result.rememberMe,
    });
    return response;
  } catch (error) {
    logger.error('Session restore error:', error);
    return NextResponse.json({ message: 'No active session' }, { status: 401 });
  }
}

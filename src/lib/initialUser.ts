import { cookies } from 'next/headers';
import { isSessionIdleExpired, readActiveSession } from '@/lib/activeSession';
import { isValidMe, mapMeToUser, type BackendAuthMeData } from '@/features/auth/api/authApi';
import type { User } from '@/features/auth/store/authSlice';
import { backendUrl } from '@/lib/env';
import { isExpired } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { newRequestId, REQUEST_ID_HEADER } from '@/lib/requestId';

/** Past this the client's own restore (which has no such cap) takes over. */
const SEED_TIMEOUT_MS = 3000;

/**
 * The signed-in user, read on the server so the first paint of a protected
 * screen does not wait for the browser to download, hydrate and *then* call
 * `/auth/me` (`AuthBootstrapGate`).
 *
 * It only ever answers for the plain case: a local session whose access token
 * is still valid and not idled out. Anything else — no session, an expired
 * token (renewing it writes cookies, which a page render cannot), an IAM
 * session (adopted and refreshed in `proxy.ts`), the backend slow or refusing —
 * returns null, and the client restores the session exactly as it always has.
 * So a wrong answer here can only cost the speed-up, never a sign-in.
 */
export async function loadInitialUser(): Promise<User | null> {
  try {
    const cookieReader = { cookies: await cookies() };
    const session = readActiveSession(cookieReader);
    if (!session || session.kind !== 'local' || !session.token || !session.claims) return null;
    if (isExpired(session.claims) || isSessionIdleExpired(session, cookieReader)) return null;

    const response = await fetch(backendUrl('/api/v1/auth/me'), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.token}`,
        [REQUEST_ID_HEADER]: newRequestId(),
      },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(SEED_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { data?: BackendAuthMeData } & BackendAuthMeData;
    const me = body?.data ?? body;
    return isValidMe(me) ? mapMeToUser(me) : null;
  } catch (error) {
    // Timeouts and an unreachable backend are expected here; the client retries.
    logger.warn('Initial user seed skipped:', error);
    return null;
  }
}

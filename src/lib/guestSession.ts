import type { NextResponse } from 'next/server';

/**
 * The session of a sensitive anonymous case opened by its link and PIN (STG-518).
 *
 * The backend hands the session token to `/api/guest/verify`, which keeps it here: httpOnly so
 * page script never sees it, SameSite=Strict, and scoped to `/api/guest` so it is sent to the
 * guest routes and nowhere else. The backend enforces the idle and absolute limits; the cookie's
 * own lifetime only stops it outliving the absolute one.
 */
export const GUEST_SESSION_COOKIE = 'grievance_guest_session';
export const GUEST_SESSION_COOKIE_PATH = '/api/guest';
/** The header the backend reads the session from (`guest_access.SESSION_HEADER`). */
export const GUEST_SESSION_HEADER = 'X-Grievance-Guest-Session';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: GUEST_SESSION_COOKIE_PATH,
};

/** Seconds until `expiresAt` (ISO), at least one; a missing or unreadable value falls back to an hour. */
export function secondsUntil(expiresAt: string | null | undefined, now = Date.now()): number {
  const at = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  if (Number.isNaN(at)) return 60 * 60;
  return Math.max(1, Math.ceil((at - now) / 1000));
}

export function setGuestSessionCookie(response: NextResponse, token: string, expiresAt?: string | null): void {
  response.cookies.set(GUEST_SESSION_COOKIE, token, { ...cookieOptions, maxAge: secondsUntil(expiresAt) });
}

export function clearGuestSessionCookie(response: NextResponse): void {
  response.cookies.set(GUEST_SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}

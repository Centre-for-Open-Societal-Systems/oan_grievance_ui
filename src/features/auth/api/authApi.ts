import { AUTH_MESSAGES } from '@/lib/authMessages';
import { logger } from '@/lib/logger';
import type { User } from '@/features/auth/store/authSlice';

interface LoginCredentials {
  usr: string;
  pwd: string;
  rememberMe?: boolean;
}

export async function loginUser({ usr, pwd, rememberMe = false }: LoginCredentials): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ usr, pwd, rememberMe }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string; user?: User };

  if (!res.ok) {
    throw new Error(data.message || AUTH_MESSAGES.invalidCredentials);
  }
  if (!data.user) {
    logger.error('Malformed login response: user is missing');
    throw new Error(AUTH_MESSAGES.signInUnavailable);
  }

  return data.user;
}

export interface RegisterFields {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
}

/** Does not sign the caller in — see the route: registration is "account created, now log in". */
export async function registerUser(fields: RegisterFields): Promise<void> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(fields),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };

  if (!res.ok) {
    throw new Error(data.message || AUTH_MESSAGES.unexpected);
  }
}

/**
 * Clears the server-side session cookies. Returns whether the server
 * confirmed it — callers should still reset client auth state either way.
 */
export async function logoutUser(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      logger.security(`Logout refused by the server with status ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Logout request failed:', error);
    return false;
  }
}

/**
 * Slides the idle-session window forward. Best-effort, like `logoutUser` —
 * a dropped heartbeat should never surface as a user-facing error, it just
 * means the idle clock keeps ticking until the next one lands.
 */
export async function sendHeartbeat(): Promise<void> {
  try {
    const res = await fetch('/api/auth/heartbeat', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      logger.security(`Heartbeat refused by the server with status ${res.status}`);
    }
  } catch (error) {
    logger.error('Heartbeat request failed:', error);
  }
}

/** Restores the session from the httpOnly cookie. Throws if there is none. */
export async function getMe(): Promise<User> {
  const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
  const data = (await res.json().catch(() => ({}))) as { email?: string; roles?: string[]; message?: string };

  if (!res.ok || !data.email || !data.roles) {
    throw new Error(data.message || AUTH_MESSAGES.sessionExpired);
  }

  return { email: data.email, roles: data.roles };
}

import { AUTH_MESSAGES } from '@/lib/authMessages';
import { fetchApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { User } from '@/features/auth/store/authSlice';

interface LoginCredentials {
  usr: string;
  pwd: string;
  rememberMe?: boolean;
}

export interface BackendAuthMeData {
  user?: string;
  login_email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  mobile_no?: string;
  roles?: string[];
  profiles?: {
    grievance?: {
      active?: number;
      administrative_area?: string | null;
      administrative_unit?: string | null;
      contact_email?: string | null;
      contact_mobile?: string | null;
      fayda_id?: string | null;
      full_name?: string | null;
      identity_scheme?: string | null;
      identity_value?: string | null;
      is_blocked?: number;
      preferred_language?: string | null;
      profile_id?: string | null;
      registration_number?: string | null;
      role?: string | null;
      type?: string | null;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type BackendAuthMeResponse = BackendAuthMeData | { data?: BackendAuthMeData; message?: string; status?: string };

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

/**
 * Restores the user session from the backend /api/v1/auth/me endpoint via proxy.
 * Only extracts needed profile and identity fields; discards unnecessary backend metadata/claims.
 */
export async function getMe(): Promise<User> {
  const res = await fetchApi<BackendAuthMeResponse>('/api/v1/auth/me', { method: 'GET' });
  const d: BackendAuthMeData | undefined = (res as { data?: BackendAuthMeData })?.data ?? (res as BackendAuthMeData);

  if (!d || (!d.user && !d.login_email && !d.full_name)) {
    throw new Error(AUTH_MESSAGES.sessionExpired);
  }

  const grievanceProfile = d.profiles?.grievance;
  const fullName = d.full_name || grievanceProfile?.full_name || d.login_email || d.user || 'User';
  const email = d.login_email || d.user || '';
  const type = grievanceProfile?.type || d.roles?.[0] || 'Grievance Submitter';

  return {
    email,
    roles: d.roles || [],
    full_name: fullName,
    first_name: d.first_name || undefined,
    last_name: d.last_name || undefined,
    mobile_no: d.mobile_no || grievanceProfile?.contact_mobile || undefined,
    type,
    profile_id: grievanceProfile?.profile_id || undefined,
    fayda_id: grievanceProfile?.fayda_id || undefined,
    administrative_area: grievanceProfile?.administrative_area || undefined,
    administrative_unit: grievanceProfile?.administrative_unit || undefined,
    preferred_language: grievanceProfile?.preferred_language || undefined,
  };
}

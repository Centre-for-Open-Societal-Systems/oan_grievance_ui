import { env } from '@/lib/env';

// Thin, server-only client for oan_auth_service's REST auth endpoints.
// Every `/api/auth/*` route calls through here rather than hitting `fetch`
// directly, so the envelope-unwrapping and error handling can't drift between
// login/register/refresh/logout.

export class BackendAuthError extends Error {
  status: number;
  /** The REST envelope's machine-readable `code` (e.g. `PASSWORD_CHANGE_REQUIRED`), when present. */
  code?: string;
  /** Cookies the error response set — IAM clears its own when a refresh finds the session over. */
  setCookies: string[];
  constructor(message: string, status: number, code?: string, setCookies: string[] = []) {
    super(message);
    this.name = 'BackendAuthError';
    this.status = status;
    this.code = code;
    this.setCookies = setCookies;
  }
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  user: string;
  roles: string[];
}

interface BackendAuthRequest {
  method?: 'GET' | 'POST';
  body?: object;
  /** Extra headers: an `Authorization` bearer, or the IAM cookies a refresh/logout forwards. */
  headers?: Record<string, string>;
}

/**
 * `path` is the REST route under `AUTH_API_BASE_URL` (e.g. `/v1/auth/login`).
 * Returns the unwrapped `data` and every `Set-Cookie` the backend answered
 * with — on an IAM refresh or logout those are IAM's own cookies, relayed by
 * oan_auth_service, for the caller to pass on to the browser unchanged.
 */
export async function requestBackendAuth<T>(
  path: string,
  { method = 'POST', body, headers }: BackendAuthRequest,
  clientIp: string
): Promise<{ data: T; setCookies: string[] }> {
  const response = await fetch(`${env.AUTH_API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Accept: 'application/json',
      'X-Forwarded-For': clientIp,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as
    | { status?: string; message?: string; code?: string; data?: T }
    | undefined;

  if (!response.ok || data?.status === 'error') {
    throw new BackendAuthError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data?.code,
      response.headers.getSetCookie()
    );
  }

  return { data: data?.data ?? (data as unknown as T), setCookies: response.headers.getSetCookie() };
}

/** `requestBackendAuth` for a JSON POST whose response cookies don't matter. */
export async function callBackendAuth<T>(path: string, body: object, clientIp: string): Promise<T> {
  return (await requestBackendAuth<T>(path, { body }, clientIp)).data;
}

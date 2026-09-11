import { env } from '@/lib/env';

// Thin, server-only client for oan_auth_service's whitelisted auth methods.
// Every `/api/auth/*` route calls through here rather than hitting `fetch`
// directly, so the envelope-unwrapping and error handling can't drift between
// login/register/refresh/logout.

export class BackendAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'BackendAuthError';
    this.status = status;
  }
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  user: string;
  roles: string[];
}

export async function callBackendAuth<T>(method: string, body: object, clientIp: string): Promise<T> {
  const response = await fetch(`${env.AUTH_API_BASE_URL}/api/method/oan_auth_service.api.v1.auth.${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Forwarded-For': clientIp,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  const envelope = (data?.message ?? data) as { status?: string; message?: string; data?: T } | undefined;

  if (!response.ok || envelope?.status === 'error') {
    throw new BackendAuthError(
      envelope?.message || `Request failed with status ${response.status}`,
      response.status
    );
  }

  return (envelope?.data ?? (envelope as unknown as T));
}

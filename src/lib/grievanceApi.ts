// Thin, browser-side client for oan_grievance_service's whitelisted methods.
// Calls go through `/api/proxy/*` (same-origin) rather than straight to the
// backend, same as every other real data call this SPA makes — the proxy is
// what injects the Authorization header from the httpOnly access-token
// cookie and silently retries once on a refreshed token. Mirrors
// `oanAuthBackend.ts`'s envelope-unwrapping, but that module is server-only
// (used inside `/api/auth/*` route handlers); this one is for client
// components calling through the proxy instead.

export class GrievanceApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GrievanceApiError';
    this.status = status;
  }
}

/**
 * Calls `oan_grievance_service.api.v1.<method>` (e.g. `attachment.submit_document`).
 * `body` is sent as JSON, or as-is when it's already a `FormData` (a file
 * upload) — the browser sets the multipart `Content-Type` boundary itself in
 * that case, which is why no `Content-Type` header is set here for it.
 */
export async function callGrievanceApi<T>(method: string, body?: FormData | object): Promise<T> {
  const isForm = body instanceof FormData;

  const response = await fetch(`/api/proxy/api/method/oan_grievance_service.api.v1.${method}`, {
    method: 'POST',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  const envelope = (data?.message ?? data) as { status?: string; message?: string; data?: T } | undefined;

  if (!response.ok || envelope?.status === 'error') {
    throw new GrievanceApiError(envelope?.message || `Request failed with status ${response.status}`, response.status);
  }

  return envelope?.data ?? (envelope as unknown as T);
}

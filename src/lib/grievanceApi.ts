// Thin, browser-side client for oan_grievance_service's whitelisted methods
// (e.g. `attachment.submit_document`). Delegates to `fetchApi` — the
// standardized client every other `/api/proxy/*` call in the app already
// goes through — for its timeout and 401-refresh-and-retry, rather than
// reimplementing a second fetch wrapper here.

import { fetchApi } from '@/lib/api/fetchApi';

// fetchApi's 15s default is sized for JSON calls. A multipart file upload
// (up to the backend's documented 10MB limit) can legitimately take longer
// than that on a slow connection — this app targets Ethiopia OpenAgriNet,
// not a fast/reliable link — so FormData bodies get a longer allowance
// instead of aborting an upload the backend would otherwise have accepted.
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Calls `oan_grievance_service.api.v1.<method>` (e.g. `attachment.submit_document`).
 * `body` is sent as JSON, or as-is when it's already a `FormData` (a file
 * upload) — `fetchApi` already knows to leave a `FormData` body's
 * `Content-Type` to the browser, which is what sets the multipart boundary.
 */
export async function callGrievanceApi<T>(method: string, body?: FormData | object): Promise<T> {
  const isForm = body instanceof FormData;
  return fetchApi<T>(
    `api/method/oan_grievance_service.api.v1.${method}`,
    {
      method: 'POST',
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    },
    isForm ? UPLOAD_TIMEOUT_MS : undefined
  );
}

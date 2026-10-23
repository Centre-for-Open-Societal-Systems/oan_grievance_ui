import { AUTH_MESSAGES } from '@/lib/authMessages';
import { ApiErrorCode, httpStatusToErrorCode } from './apiErrors';

// In the browser, requests are same-origin. On the server (SSR), there is no
// origin, so prefer an explicit deployment URL and fall back to localhost on
// the actual configured port rather than a hardcoded 3000.
const BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

export class ApiError extends Error {
  responseData: unknown;
  /** HTTP status that produced this error, so callers can classify it (e.g. 5xx → Connection). */
  status?: number;

  constructor(message: string, responseData?: unknown, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.responseData = responseData;
    if (status !== undefined) this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * The per-field error map from a failed REST response (`/api/v1/...`),
 * located at the top level next to `code: VALIDATION_ERROR`.
 */
function fieldDetailsOf(responseData: unknown): Record<string, unknown> | null {
  const data = responseData as { details?: unknown } | null | undefined;
  const details = data?.details;
  return details && typeof details === 'object' ? (details as Record<string, unknown>) : null;
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const details = fieldDetailsOf(error.responseData);
  if (!details) return {};
  return Object.fromEntries(
    Object.entries(details).filter(([, v]) => typeof v === 'string')
  ) as Record<string, string>;
}

/**
 * One readable sentence from the per-field details ("Description: Description
 * must be at least 20 characters."), or null when there are none worth showing
 * — including an empty map, so the caller falls back to the response's own
 * message rather than to generic copy.
 */
function messageFromDetails(responseData: unknown): string | null {
  const details = fieldDetailsOf(responseData);
  if (!details) return null;
  const entries = Object.entries(details).filter(([, v]) => Boolean(v));
  if (entries.length === 0) return null;
  return entries
    .map(([k, v]) => {
      // A cross-field rule arrives under an empty key — there is no field name to lead with.
      const field = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return field ? `${field}: ${v}` : String(v);
    })
    .reduce((joined, part) => {
      if (!joined) return part;
      // Backend messages usually end in a full stop already; don't double it up.
      return /[.!?]$/.test(joined) ? `${joined} ${part}` : `${joined}. ${part}`;
    }, '');
}

/**
 * Fallback copy for a failed request, used when the response carries no usable
 * application message.
 */
function genericMessageForStatus(status: number): string {
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status === 404) return 'We could not find what you were looking for.';
  if (status >= 500) return 'The server ran into a problem. Please try again shortly.';
  if (status >= 400) return 'We could not complete that request. Please check your input and try again.';
  return 'Something went wrong. Please try again.';
}

/** Why a session ended: idled out by this app's clock, or simply no longer renewable. */
export type SessionEndReason = 'idle' | 'expired';

/**
 * `renewed` — retry the request. `ended` — the refresh route refused with a
 * 401, so there is no session left to retry with. `failed` — a network error,
 * a 5xx or a rate limit: the session may well still be fine.
 */
type RefreshOutcome = { kind: 'renewed' } | { kind: 'ended'; reason: SessionEndReason } | { kind: 'failed' };

let activeRefresh: Promise<RefreshOutcome> | null = null;
let sessionEndedHandler: ((reason: SessionEndReason) => void) | null = null;

/**
 * Registers what happens when a request finds the session over — refresh
 * refused, not merely failed. `shared`-level code can't know about routing
 * or Redux, so the auth feature supplies this (`AuthBootstrapGate`).
 * Returns an unregister function.
 */
export function onSessionEnded(handler: (reason: SessionEndReason) => void): () => void {
  sessionEndedHandler = handler;
  return () => {
    if (sessionEndedHandler === handler) sessionEndedHandler = null;
  };
}

async function refreshSession(): Promise<RefreshOutcome> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (res.ok) return { kind: 'renewed' };
    if (res.status !== 401) return { kind: 'failed' };
    const data = (await res.json().catch(() => ({}))) as { message?: unknown };
    return { kind: 'ended', reason: data.message === AUTH_MESSAGES.sessionExpiredIdle ? 'idle' : 'expired' };
  } catch {
    return { kind: 'failed' };
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('TimeoutError')), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener('abort', () => controller.abort(options.signal?.reason));
    }
  }

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    const err = error as { name?: string; message?: string };
    if (err.name === 'AbortError' && options.signal?.aborted) {
      throw error; // Intentional abort from frontend (e.g. unmount)
    }
    if (err.message === 'TimeoutError' || err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new ApiError('The server is taking too long to respond. Please try again.', null, 408);
    }
    throw new ApiError('Network error. Please check your connection.', null, 0);
  }
}

/**
 * Standardized API client for all backend communication via `/api/proxy/*`.
 * Accepts absolute proxy path (e.g. `/api/v1/submitters/options`) or relative path.
 * `timeoutMs` overrides the default 15s — a `FormData` file upload can
 * legitimately take longer than a JSON call on a slow connection.
 * Used through `fetchApi` (the data) or `fetchApiWithMeta` (the data and the envelope's `meta`).
 */
async function requestEnvelope<T>(
  path: string,
  options: RequestInit,
  timeoutMs: number | undefined
): Promise<{ data: T; meta: unknown }> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const proxyPath = cleanPath.startsWith('api/proxy/') ? cleanPath : `api/proxy/${cleanPath}`;
  const url = new URL(proxyPath, BASE_URL);

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  let response = await fetchWithTimeout(
    url.toString(),
    {
      ...options,
      credentials: 'include',
      headers,
    },
    timeoutMs
  );

  if (response.status === 401 && typeof window !== 'undefined') {
    if (!activeRefresh) {
      activeRefresh = refreshSession().then(
        (outcome) => {
          activeRefresh = null;
          return outcome;
        },
        () => {
          activeRefresh = null;
          return { kind: 'failed' } as const;
        }
      );
    }
    // The proxy's own 401 is the one that knows it was an idle kick: it
    // clears the idle cookie, so the refresh after it only sees "no session".
    const refresh = activeRefresh;
    const proxyMessage = ((await response.clone().json().catch(() => ({}))) as { message?: unknown }).message;
    const outcome = await refresh;
    if (outcome.kind === 'ended') {
      // Every request that 401'd alongside this one gets here too — the
      // handler is expected to act once.
      sessionEndedHandler?.(proxyMessage === AUTH_MESSAGES.sessionExpiredIdle ? 'idle' : outcome.reason);
    }
    if (outcome.kind === 'renewed') {
      response = await fetchWithTimeout(
        url.toString(),
        {
          ...options,
          credentials: 'include',
          headers,
        },
        timeoutMs
      );
    }
  }

  let responseData: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    responseData = await response.json();
  } catch (error) {
    const abortReason = options.signal?.aborted ? options.signal.reason : undefined;
    const isAbort = (error as { name?: string } | null)?.name === 'AbortError' || error === abortReason;
    if (options.signal?.aborted && isAbort) throw error;
    if (!response.ok) throw new ApiError(genericMessageForStatus(response.status), null, response.status);
    return { data: null as T, meta: undefined };
  }

  if (!response.ok) {
    const authCode = httpStatusToErrorCode(response.status);
    if (authCode === ApiErrorCode.Auth || authCode === ApiErrorCode.Forbidden) {
      throw new Error(authCode);
    }

    let errorMsg = genericMessageForStatus(response.status);
    const detailsMessage = messageFromDetails(responseData);
    if (detailsMessage) {
      errorMsg = detailsMessage;
    } else if (typeof responseData?.message === 'string') {
      errorMsg = responseData.message;
    }
    throw new ApiError(errorMsg, responseData, response.status);
  }

  // Handle application-level errors returned with status 200
  if (responseData?.status === 'error') {
    const errorMsg = messageFromDetails(responseData) ?? (typeof responseData?.message === 'string' ? responseData.message : 'Application Error');
    throw new ApiError(errorMsg, responseData);
  }

  const unwrapped = responseData?.data ?? responseData;

  // `page_meta`'s pagination, and the envelope's own human-readable `message` (e.g. officer
  // creation's "... already had a login, so their existing password is unchanged" — a caller
  // needs that to warn the admin a temporary password they just set won't actually work),
  // both ride as siblings of `data` in the envelope (`_envelope_success` in
  // `oan_auth_service.api.utils`), not inside it. Some REST routes (grievances) additionally
  // duplicate pagination inside `data` themselves, which is what let a bare `responseData.data`
  // return value look correct for those; routes that don't duplicate it (officers) would
  // otherwise lose it entirely. Merging each sibling in here — only when `data` doesn't already
  // carry its own key of that name — covers both without every endpoint needing to remember to
  // self-duplicate it.
  if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    const extra: Record<string, unknown> = {};
    if (!('pagination' in unwrapped) && responseData?.pagination) {
      extra.pagination = responseData.pagination;
    }
    if (!('message' in unwrapped) && typeof responseData?.message === 'string') {
      extra.message = responseData.message;
    }
    if (Object.keys(extra).length > 0) {
      return { data: { ...unwrapped, ...extra } as T, meta: responseData?.meta };
    }
  }

  return { data: unwrapped as T, meta: responseData?.meta };
}

/**
 * Same call as `fetchApi`, with the envelope's `meta` (e.g. when each chart of
 * `GET /api/v1/charts` was refreshed) returned beside the data rather than
 * spliced into it, where it could collide with a key the data has itself.
 */
export async function fetchApiWithMeta<T = unknown>(
  path: string,
  options: RequestInit = {},
  timeoutMs?: number
): Promise<{ data: T; meta: unknown }> {
  return requestEnvelope<T>(path, options, timeoutMs);
}

/** The data of the call, exactly as every caller has always had it. */
export async function fetchApi<T = unknown>(path: string, options: RequestInit = {}, timeoutMs?: number): Promise<T> {
  return (await requestEnvelope<T>(path, options, timeoutMs)).data;
}

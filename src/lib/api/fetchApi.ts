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

export function extractFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const details = (error.responseData as { message?: { details?: unknown } } | undefined)?.message?.details;
  if (!details || typeof details !== 'object') return {};
  return Object.fromEntries(
    Object.entries(details).filter(([, v]) => typeof v === 'string')
  ) as Record<string, string>;
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

let activeRefresh: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
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
 */
export async function fetchApi<T = unknown>(
  path: string,
  options: RequestInit = {},
  timeoutMs?: number
): Promise<T> {
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
        (success) => {
          activeRefresh = null;
          return success;
        },
        () => {
          activeRefresh = null;
          return false;
        }
      );
    }
    const success = await activeRefresh;
    if (success) {
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
    return null as T;
  }

  if (!response.ok) {
    const authCode = httpStatusToErrorCode(response.status);
    if (authCode === ApiErrorCode.Auth || authCode === ApiErrorCode.Forbidden) {
      throw new Error(authCode);
    }

    let errorMsg = genericMessageForStatus(response.status);
    if (responseData?.message?.details && typeof responseData.message.details === 'object') {
      const detailEntries = Object.entries(responseData.message.details).filter(([, v]) => Boolean(v));
      if (detailEntries.length > 0) {
        errorMsg = detailEntries
          .map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: ${v}`)
          .join('. ');
      } else if (responseData?.message?.message) {
        errorMsg = responseData.message.message;
      }
    } else if (responseData?.message?.message) {
      errorMsg = responseData.message.message;
    } else if (typeof responseData?.message === 'string') {
      errorMsg = responseData.message;
    }
    throw new ApiError(errorMsg, responseData, response.status);
  }

  // Handle application-level errors returned with status 200
  if (responseData?.message?.status === 'error' || responseData?.status === 'error') {
    let errorMsg = responseData.message?.message || responseData?.message || 'Application Error';
    if (responseData?.message?.details && typeof responseData.message.details === 'object') {
      const detailEntries = Object.entries(responseData.message.details).filter(([, v]) => Boolean(v));
      if (detailEntries.length > 0) {
        errorMsg = detailEntries
          .map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: ${v}`)
          .join('. ');
      }
    }
    throw new ApiError(typeof errorMsg === 'string' ? errorMsg : 'Application Error', responseData);
  }

  return (responseData?.data ?? responseData?.message?.data ?? responseData?.message ?? responseData) as T;
}

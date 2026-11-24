// A request/correlation id ties one browser call to the proxy's log line and to
// the backend's: the browser mints it, `/api/proxy` relays it upstream and
// echoes it back, and every failure log carries it.

import { randomUuid } from '@/lib/randomUuid';

export const REQUEST_ID_HEADER = 'x-request-id';

// Anything a client sends is untrusted and ends up in log lines, so only a
// short, plain token is accepted — no whitespace or newlines to forge entries with.
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

export function newRequestId(): string {
  // Not `crypto.randomUUID()`: it is missing over plain http on a non-localhost host.
  return randomUuid();
}

/** The caller's id when it is well-formed, otherwise a fresh one. */
export function requestIdFrom(headers: Headers): string {
  const supplied = headers.get(REQUEST_ID_HEADER);
  return isValidRequestId(supplied) ? supplied : newRequestId();
}

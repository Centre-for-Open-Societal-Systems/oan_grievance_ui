// Keeps tokens and personal data out of log lines. Applied to everything the
// logger prints and to every report the browser sends, because a log is read
// by far more people than the screen it describes.

import { isValidRequestId } from '@/lib/requestId';

const REDACTED = '[redacted]';

// A key whose value is never logged, whatever it holds. Unambiguous words are
// matched anywhere in the key; short ones that sit inside ordinary words
// ("otp" in "footprint", "pass" in "bypass") only as a whole word of the key.
const SENSITIVE_SUBSTRING =
  /password|passcode|secret|token|authorization|cookie|credential|api.?key|e-?mail|phone|mobile|fayda|national.?id|full.?name|first.?name|last.?name|description|comment/i;
const SENSITIVE_WORDS: ReadonlySet<string> = new Set(['pass', 'otp', 'pin', 'session', 'address', 'body']);

function isSensitiveKey(key: string): boolean {
  if (SENSITIVE_SUBSTRING.test(key)) return true;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return words.some((word) => SENSITIVE_WORDS.has(word));
}

const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g;
const BEARER = /\bBearer\s+[\w.~+/=-]+/gi;
const EMAIL = /[^\s@/:]+@[^\s@/]+\.[^\s@/]+/g;
const LONG_DIGITS = /\b\d{9,}\b/g;

const MAX_STRING = 500;
const MAX_STACK = 4_000;
const MAX_DEPTH = 4;
const MAX_KEYS = 30;

function scrub(value: string): string {
  return value
    .replace(JWT, REDACTED)
    .replace(BEARER, `Bearer ${REDACTED}`)
    .replace(EMAIL, REDACTED)
    .replace(LONG_DIGITS, REDACTED);
}

export function redactString(value: string): string {
  const scrubbed = scrub(value);
  return scrubbed.length > MAX_STRING ? `${scrubbed.slice(0, MAX_STRING)}…` : scrubbed;
}

/**
 * The path of a URL without its query string or fragment: a query carries
 * search text and filters, which can hold anything a user typed.
 */
export function safePath(url: string): string {
  const cut = url.search(/[?#]/);
  return redactString(cut === -1 ? url : url.slice(0, cut));
}

export interface RedactOptions {
  /**
   * Keep an `Error`'s stack (scrubbed) and its own fields such as an
   * `ApiError`'s `status`. For server logs only: never for anything that
   * leaves the browser, where a stack is more than a report needs.
   */
  keepStack?: boolean;
}

function redactEntries(entries: [string, unknown][], depth: number, options: RedactOptions): Record<string, unknown> {
  return Object.fromEntries(
    entries.slice(0, MAX_KEYS).map(([key, item]) => {
      // A request id is an opaque correlation token, not data: scrubbing it (a
      // numeric Next `digest` looks like a long number) would break the trail.
      if (key === 'requestId' && isValidRequestId(item)) return [key, item];
      return [key, isSensitiveKey(key) ? REDACTED : redact(item, depth + 1, options)];
    })
  );
}

function redactError(error: Error, depth: number, options: RedactOptions): unknown {
  const base = { name: error.name, message: redactString(error.message) };
  if (!options.keepStack) return base;
  const own = Object.entries(error).filter(([key]) => key !== 'name' && key !== 'message');
  return {
    ...base,
    ...(error.stack ? { stack: scrub(error.stack).slice(0, MAX_STACK) } : {}),
    ...redactEntries(own, depth, options),
  };
}

export function redact(value: unknown, depth = 0, options: RedactOptions = {}): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return redactError(value, depth, options);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof Headers !== 'undefined' && value instanceof Headers) {
    return redactEntries([...value.entries()], depth, options);
  }
  if (typeof Response !== 'undefined' && value instanceof Response) {
    return { status: value.status, statusText: redactString(value.statusText) };
  }
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, MAX_KEYS).map((item) => redact(item, depth + 1, options));
  if (typeof value === 'object') return redactEntries(Object.entries(value as Record<string, unknown>), depth, options);
  return typeof value;
}

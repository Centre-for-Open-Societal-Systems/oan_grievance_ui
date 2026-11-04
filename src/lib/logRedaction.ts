// Keeps tokens and personal data out of log lines. Applied to everything the
// logger prints and to every report the browser sends, because a log is read
// by far more people than the screen it describes.

const REDACTED = '[redacted]';

// A key whose value is never logged, whatever it holds.
const SENSITIVE_KEY =
  /pass(word|code)?|secret|token|authorization|cookie|session|otp|pin\b|fayda|national.?id|e-?mail|phone|mobile|address|full.?name|first.?name|last.?name|description|comment|body|credential|api.?key/i;

const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g;
const BEARER = /\bBearer\s+[\w.~+/=-]+/gi;
const EMAIL = /[^\s@/:]+@[^\s@/]+\.[^\s@/]+/g;
const LONG_DIGITS = /\b\d{9,}\b/g;

const MAX_STRING = 500;
const MAX_DEPTH = 4;
const MAX_KEYS = 30;

export function redactString(value: string): string {
  const scrubbed = value
    .replace(JWT, REDACTED)
    .replace(BEARER, `Bearer ${REDACTED}`)
    .replace(EMAIL, REDACTED)
    .replace(LONG_DIGITS, REDACTED);
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

export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    // A stack holds file paths and, for a thrown message, whatever it interpolated.
    return { name: value.name, message: redactString(value.message) };
  }
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, MAX_KEYS).map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_KEYS)
        .map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1)])
    );
  }
  return String(typeof value);
}

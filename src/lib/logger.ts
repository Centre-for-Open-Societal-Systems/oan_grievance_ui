import { redact, redactString } from '@/lib/logRedaction';

const isProduction = process.env.NODE_ENV === 'production';

// Stacks and an error's own fields (an `ApiError`'s status) stay in these logs;
// only secrets and personal data are scrubbed.
const forLog = (param: unknown): unknown => redact(param, 0, { keepStack: true });

export type EventLevel = 'warn' | 'error';

export interface LogEvent {
  /** Stable machine-readable name, e.g. `api.request_failed`, `render.error`. */
  event: string;
  /** Correlation id shared by the browser, `/api/proxy` and the backend. */
  requestId?: string;
  /** Where it happened: `client` for a report from the browser, `server` otherwise. */
  source?: 'client' | 'server';
  [field: string]: unknown;
}

// Central logging surface for server route handlers and the browser alike: a
// single place to later forward to an observability platform and to keep noisy
// debug output out of production, while security-relevant events are never
// silently lost. Everything printed passes through the redaction helper, so a
// token or an address someone interpolated into a message does not reach a log.
export const logger = {
  warn(message: string, ...optionalParams: unknown[]): void {
    if (!isProduction) {
      console.warn(redactString(message), ...optionalParams.map(forLog));
    }
  },
  error(message: string, ...optionalParams: unknown[]): void {
    console.error(redactString(message), ...optionalParams.map(forLog));
  },
  /**
   * Security-relevant events: rejected sign-ins, rate limits tripped, refused
   * token refreshes. Always emitted, production included — these are exactly
   * the details withheld from the browser's generic error message.
   */
  security(message: string, ...optionalParams: unknown[]): void {
    console.warn(`[security] ${redactString(message)}`, ...optionalParams.map(forLog));
  },
  log(message: string, ...optionalParams: unknown[]): void {
    if (!isProduction) {
      console.log(redactString(message), ...optionalParams.map(forLog));
    }
  },
  /**
   * One structured line per notable failure (a failed API call, a render
   * error, a failed flow). Always emitted. Fields are redacted by key and by
   * value; never put a request or response body in them.
   */
  event(level: EventLevel, fields: LogEvent): void {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      ...(redact(fields, 0, { keepStack: true }) as Record<string, unknown>),
    });
    if (level === 'error') console.error(line);
    else console.warn(line);
  },
};

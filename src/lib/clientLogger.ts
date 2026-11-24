import { redact, safePath } from '@/lib/logRedaction';

// Browser-side reporting. Sends a small, already-redacted record to
// `/api/client-logs`, whose handler writes it through the same server `logger` as
// every route handler. Uses plain `fetch`, never `fetchApi`: reporting a
// failed call must not itself go through the code that reports failures.

export type ClientEventName =
  | 'api.request_failed'
  | 'render.error'
  | 'window.error'
  | 'window.unhandled_rejection'
  | 'flow.failed';

export interface ClientEvent {
  event: ClientEventName;
  requestId?: string;
  /** What the user was doing, e.g. `submit-grievance`. */
  flow?: string;
  status?: number;
  method?: string;
  /** A URL or path; only its path is sent. */
  path?: string;
  /** The error's class (`TypeError`), never its text: that can carry what a user typed. */
  errorName?: string;
  /** Where an uncaught error came from: `/_next/static/chunk.js:12:34`. */
  location?: string;
  /** Where the browser was, as a path (no query). */
  page?: string;
}

const ENDPOINT = '/api/client-logs';

// A page stuck in a render loop or a failing poll must not turn into a flood.
const MAX_REPORTS_PER_PAGE = 50;
const DEDUPE_WINDOW_MS = 30_000;

let sent = 0;
const recent = new Map<string, number>();

function dedupeKey(event: ClientEvent): string {
  return [event.event, event.flow, event.method, event.path && safePath(event.path), event.status, event.errorName, event.location].join('|');
}

export function reportClientEvent(event: ClientEvent): void {
  if (typeof window === 'undefined') return;
  if (sent >= MAX_REPORTS_PER_PAGE) return;

  const now = Date.now();
  const key = dedupeKey(event);
  const last = recent.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return;
  recent.set(key, now);
  sent += 1;

  const body = JSON.stringify(
    redact({
      ...event,
      path: event.path ? safePath(event.path) : undefined,
      page: safePath(event.page ?? window.location.pathname),
    })
  );

  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body,
    }).catch(() => undefined);
  } catch {
    // Reporting is best-effort; it must never throw into the code being reported.
  }
}

/**
 * Starts a fresh budget. Called on each in-app navigation (the page never
 * reloads in this SPA, so a per-load cap would silence a long session) and by tests.
 */
export function resetClientReportBudget(): void {
  sent = 0;
  recent.clear();
}

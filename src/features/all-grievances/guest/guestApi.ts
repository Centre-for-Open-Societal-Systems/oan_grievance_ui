import { z } from 'zod';

/**
 * The browser side of a sensitive anonymous case opened by its link and PIN (STG-518).
 *
 * Every call goes to this app's own `/api/guest/*` routes, which hold the guest session in an
 * httpOnly cookie and relay to the backend. Nothing here ever sees the session token.
 */

export const GUEST_ERROR = {
  INVALID: 'GUEST_ACCESS_INVALID',
  LOCKED: 'GUEST_ACCESS_LOCKED',
  CLOSED: 'GUEST_ACCESS_CLOSED',
  SESSION_EXPIRED: 'GUEST_SESSION_EXPIRED',
  UNAVAILABLE: 'GUEST_ACCESS_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMIT_EXCEEDED',
  NETWORK: 'NETWORK',
  UNKNOWN: 'UNKNOWN',
} as const;

export type GuestErrorCode = (typeof GUEST_ERROR)[keyof typeof GUEST_ERROR];

const KNOWN_CODES = new Set<string>(Object.values(GUEST_ERROR));

export class GuestApiError extends Error {
  constructor(
    readonly code: GuestErrorCode,
    readonly status: number,
    readonly retryAfterSeconds: number | null = null
  ) {
    super(code);
    this.name = 'GuestApiError';
  }

  /** The session is gone: expired, ended, or its case closed. The page goes back to the PIN screen. */
  get endsSession(): boolean {
    return this.code === GUEST_ERROR.SESSION_EXPIRED || this.code === GUEST_ERROR.CLOSED;
  }
}

const errorBody = z.object({
  code: z.string().nullish(),
  details: z.object({ retry_after_seconds: z.number().nullish() }).partial().nullish(),
});

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({ data });
}

export const verifyDataSchema = z.object({
  ticket_number: z.string(),
  idle_timeout_seconds: z.number().int().positive(),
  expires_at: z.string().nullish(),
});
export type GuestVerifyData = z.infer<typeof verifyDataSchema>;

export const sessionDataSchema = z.object({
  idle_timeout_seconds: z.number().int().positive(),
  expires_at: z.string().nullish(),
});

const attachmentSchema = z.object({
  name: z.string(),
  attachment: z.string().nullish(),
  file_name: z.string().nullish(),
  mime_type: z.string().nullish(),
  file_size: z.number().nullish(),
  size_bytes: z.number().nullish(),
  document_type: z.string().nullish(),
  timeline_entry: z.string().nullish(),
  scan_status: z.string().nullish(),
  creation: z.string().nullish(),
});
export type GuestAttachment = z.infer<typeof attachmentSchema>;

const entrySchema = z.object({
  id: z.string().nullish(),
  name: z.string().nullish(),
  entry_type: z.string(),
  body: z.string().nullish(),
  author_type: z.string().nullish(),
  created_on: z.string().nullish(),
  from_status: z.string().nullish(),
  to_status: z.string().nullish(),
  action: z.string().nullish(),
  action_taken: z.string().nullish(),
  resolution_summary: z.string().nullish(),
  response_number: z.number().nullish(),
  attachments: z.array(attachmentSchema).nullish(),
});
export type GuestTimelineEntry = z.infer<typeof entrySchema>;

export const guestCaseSchema = z.object({
  ticket_number: z.string(),
  status: z.string(),
  description: z.string().nullish(),
  desired_outcome: z.string().nullish(),
  service_category: z.string().nullish(),
  grievance_type: z.string().nullish(),
  grievance_type_name: z.string().nullish(),
  location: z.string().nullish(),
  sla: z
    .object({
      sla_due_date: z.string().nullish(),
      is_paused: z.boolean().nullish(),
      confirmation_deadline: z.string().nullish(),
    })
    .nullish(),
  attachments: z.array(attachmentSchema).default([]),
  timeline: z.array(entrySchema).default([]),
  has_more: z.boolean().nullish(),
  next_cursor: z.string().nullish(),
});
export type GuestCase = z.infer<typeof guestCaseSchema>;

const postedSchema = z.object({ name: z.string().nullish() });

async function call<T extends z.ZodTypeAny>(path: string, init: RequestInit, schema: T): Promise<z.infer<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/guest/${path}`, { ...init, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new GuestApiError(GUEST_ERROR.NETWORK, 0);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const parsed = errorBody.safeParse(body);
    const code = parsed.success ? (parsed.data.code ?? '') : '';
    const retry = parsed.success ? (parsed.data.details?.retry_after_seconds ?? null) : null;
    throw new GuestApiError(
      KNOWN_CODES.has(code) ? (code as GuestErrorCode) : GUEST_ERROR.UNKNOWN,
      response.status,
      retry
    );
  }

  const parsed = envelope(schema).safeParse(body);
  if (!parsed.success) throw new GuestApiError(GUEST_ERROR.UNKNOWN, response.status);
  return (parsed.data as { data: z.infer<T> }).data;
}

/** POST /api/guest/verify: the ticket and token from the link and the PIN typed. */
export function verifyGuestAccess(ticketNumber: string, token: string, pin: string): Promise<GuestVerifyData> {
  return call(
    'verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_number: ticketNumber, token, pin }),
    },
    verifyDataSchema
  );
}

/** GET /api/guest/session: keeps the session alive ("Stay signed in") and says how long it now has. */
export function keepGuestSessionAlive() {
  return call('session', { method: 'GET' }, sessionDataSchema);
}

/** POST /api/guest/logout: ends the session on the server. Never throws: the page leaves either way. */
export async function endGuestSession(): Promise<void> {
  try {
    await fetch('/api/guest/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
  } catch {
    // The session ends on its own at the idle limit.
  }
}

/** GET /api/guest/grievance: the case the session is bound to, with its public timeline and files. */
export function fetchGuestCase(): Promise<GuestCase> {
  return call('grievance', { method: 'GET' }, guestCaseSchema);
}

/** POST /api/guest/grievance/message: a reply, with files as multipart. */
export function postGuestReply(body: string, files: File[]) {
  const form = new FormData();
  form.append('body', body);
  for (const file of files) form.append('files', file);
  return call('grievance/message', { method: 'POST', body: form }, postedSchema);
}

/** The route the case panel's components fetch one of the case's files through. */
export function guestAttachmentViewUrl(attachmentId: string): string {
  return `/api/guest/grievance/attachments/${encodeURIComponent(attachmentId)}/view`;
}

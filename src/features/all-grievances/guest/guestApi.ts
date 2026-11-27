import { z } from 'zod';

/**
 * The browser side of a sensitive anonymous case opened by its link and PIN (STG-518).
 *
 * One read-only, stateless call to this app's `/api/guest/grievance`, which relays it to the
 * backend. Every view sends the ticket, the link's token and the PIN; nothing is kept between
 * calls, so the page holds them in memory only.
 */

export const GUEST_ERROR = {
  INVALID: 'GUEST_ACCESS_INVALID',
  LOCKED: 'GUEST_ACCESS_LOCKED',
  CLOSED: 'GUEST_ACCESS_CLOSED',
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
}

const errorBody = z.object({
  code: z.string().nullish(),
  details: z.object({ retry_after_seconds: z.number().nullish() }).partial().nullish(),
});

const attachmentSchema = z.object({
  name: z.string(),
  file_name: z.string().nullish(),
  mime_type: z.string().nullish(),
  file_size: z.number().nullish(),
  document_type: z.string().nullish(),
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
  grievance_type_name: z.string().nullish(),
  location: z.string().nullish(),
  sla: z
    .object({
      sla_due_date: z.string().nullish(),
      confirmation_deadline: z.string().nullish(),
    })
    .nullish(),
  attachments: z.array(attachmentSchema).default([]),
  timeline: z.array(entrySchema).default([]),
});
export type GuestCase = z.infer<typeof guestCaseSchema>;

/** POST /api/guest/grievance: the case, for the ticket and token from the link and the PIN typed. */
export async function viewGuestCase(ticketNumber: string, token: string, pin: string): Promise<GuestCase> {
  let response: Response;
  try {
    response = await fetch('/api/guest/grievance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_number: ticketNumber, token, pin }),
      credentials: 'same-origin',
      cache: 'no-store',
    });
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

  const parsed = z.object({ data: guestCaseSchema }).safeParse(body);
  if (!parsed.success) throw new GuestApiError(GUEST_ERROR.UNKNOWN, response.status);
  return parsed.data.data;
}

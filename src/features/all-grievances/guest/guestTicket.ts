/**
 * The ticket number in a case link (`/g/<ticket>`), decoded and checked, or null.
 *
 * Ticket numbers are Crockford Base32 (letters and digits), printed with or without hyphens
 * (3001002A0 or 3-001-002A-0). Anything else, including a segment that is not valid
 * percent-encoding (`decodeURIComponent` throws on `%E0%A4%A`), is not a case link.
 */
const TICKET_PATTERN = /^[0-9A-Za-z](?:[0-9A-Za-z-]{0,30}[0-9A-Za-z])?$/;

export function parseGuestTicket(segment: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  return TICKET_PATTERN.test(decoded) ? decoded : null;
}

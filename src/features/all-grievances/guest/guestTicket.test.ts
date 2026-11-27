import { describe, expect, it } from 'vitest';
import { parseGuestTicket } from './guestTicket';

describe('parseGuestTicket', () => {
  it('accepts a ticket number flat or grouped', () => {
    expect(parseGuestTicket('3001002A0')).toBe('3001002A0');
    expect(parseGuestTicket('3-001-002A-0')).toBe('3-001-002A-0');
    expect(parseGuestTicket('3%2D001%2D002A%2D0')).toBe('3-001-002A-0');
  });

  it('refuses a segment that is not valid percent-encoding, instead of throwing', () => {
    expect(parseGuestTicket('%E0%A4%A')).toBeNull();
  });

  it('refuses anything not shaped like a ticket number', () => {
    for (const segment of ['', '-', '3-', 'a b', '<script>', '..%2F..', 'x'.repeat(33)]) {
      expect(parseGuestTicket(segment)).toBeNull();
    }
  });
});

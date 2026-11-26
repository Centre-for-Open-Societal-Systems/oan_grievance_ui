import { describe, expect, it } from 'vitest';
import { secondsUntil } from './guestSession';

describe('secondsUntil', () => {
  const now = Date.parse('2026-11-26T10:00:00Z');

  it('counts the seconds to the absolute limit', () => {
    expect(secondsUntil('2026-11-26T11:00:00Z', now)).toBe(3600);
  });

  it('is at least one second, and an hour for a value it cannot read', () => {
    expect(secondsUntil('2026-11-26T09:00:00Z', now)).toBe(1);
    expect(secondsUntil(null, now)).toBe(3600);
    expect(secondsUntil('not a date', now)).toBe(3600);
  });
});

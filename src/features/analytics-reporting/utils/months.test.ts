import { describe, expect, it } from 'vitest';
import { currentMonth, isMonth, isSelectableMonth } from './months';

describe('months', () => {
  it('knows a complete month from a half-typed or malformed one', () => {
    expect(isMonth('2026-10')).toBe(true);
    expect(isMonth('2026-1')).toBe(false);
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('October')).toBe(false);
    expect(isMonth('')).toBe(false);
  });

  it('names the current month in local time, zero-padded', () => {
    expect(currentMonth(new Date(2026, 2, 5))).toBe('2026-03');
    expect(currentMonth(new Date(2026, 9, 23))).toBe('2026-10');
  });

  it('refuses a month after the latest one that can be picked', () => {
    expect(isSelectableMonth('2026-10', '2026-10')).toBe(true);
    expect(isSelectableMonth('2026-04', '2026-10')).toBe(true);
    expect(isSelectableMonth('2027-03', '2026-10')).toBe(false);
    expect(isSelectableMonth('2026-1', '2026-10')).toBe(false);
  });
});

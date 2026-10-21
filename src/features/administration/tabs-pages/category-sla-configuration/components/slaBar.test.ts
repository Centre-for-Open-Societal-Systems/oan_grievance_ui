import { describe, expect, it } from 'vitest';
import { DEFAULT_SLA_BAR_REFERENCE_DAYS, slaBarPercent, slaBarReferenceDays } from './slaBar';

describe('slaBarPercent', () => {
  it('is the category SLA as a share of the global figure', () => {
    expect(slaBarPercent(7, 9)).toBe(78);
    expect(slaBarPercent(8, 9)).toBe(89);
  });

  it('moves when either number changes', () => {
    expect(slaBarPercent(7, 9)).not.toBe(slaBarPercent(8, 9));
    expect(slaBarPercent(7, 9)).not.toBe(slaBarPercent(7, 14));
  });

  it('caps at a full bar when a category is longer than the global figure', () => {
    expect(slaBarPercent(12, 9)).toBe(100);
  });

  it('shows an empty bar for a missing or nonsensical figure rather than NaN', () => {
    expect(slaBarPercent(5, 0)).toBe(0);
    expect(slaBarPercent(Number.NaN, 9)).toBe(0);
    expect(slaBarPercent(-3, 9)).toBe(0);
  });

  it('keeps a 30-day fallback scale until the policy loads', () => {
    expect(DEFAULT_SLA_BAR_REFERENCE_DAYS).toBe(30);
  });
});

describe('slaBarReferenceDays', () => {
  it('uses the global figure when it is a usable number', () => {
    expect(slaBarReferenceDays(9)).toBe(9);
  });

  it('falls back to the default scale until the policy loads, or if it holds nothing usable', () => {
    for (const unusable of [null, undefined, 0, -4, Number.NaN]) {
      expect(slaBarReferenceDays(unusable)).toBe(DEFAULT_SLA_BAR_REFERENCE_DAYS);
    }
  });
});

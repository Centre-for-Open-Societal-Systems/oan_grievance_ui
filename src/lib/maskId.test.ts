import { describe, expect, it } from 'vitest';
import { maskIdKeepLast4 } from './maskId';

describe('maskIdKeepLast4', () => {
  it('keeps only the last four characters', () => {
    expect(maskIdKeepLast4('1234567890123456')).toBe('••••••••••••3456');
  });

  it('masks a value of four characters or fewer entirely', () => {
    expect(maskIdKeepLast4('1234')).toBe('••••');
    expect(maskIdKeepLast4('')).toBe('');
  });
});

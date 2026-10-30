import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './returnPath';

describe('safeReturnPath', () => {
  it('keeps a same-origin path with its query and fragment', () => {
    expect(safeReturnPath('/all-grievances')).toBe('/all-grievances');
    expect(safeReturnPath('/grievances/G-1?tab=history#notes')).toBe('/grievances/G-1?tab=history#notes');
    expect(safeReturnPath('/')).toBe('/');
  });

  it('rejects nothing at all', () => {
    for (const value of [null, undefined, '']) expect(safeReturnPath(value)).toBeNull();
  });

  it('rejects absolute and protocol-relative URLs', () => {
    for (const value of ['https://evil.com', 'javascript:alert(1)', '//evil.com', '/\\evil.com', '\\\\evil.com']) {
      expect(safeReturnPath(value)).toBeNull();
    }
  });

  it('rejects a path a browser would turn into //host by stripping a tab, CR or LF', () => {
    // As URLSearchParams decodes `/%09/evil.com` etc.
    for (const value of ['/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '/\\\t/evil.com', '/\t\\evil.com']) {
      expect(safeReturnPath(value)).toBeNull();
    }
  });

  it('rejects any other control character', () => {
    expect(safeReturnPath('/grievances\u0000')).toBeNull();
    expect(safeReturnPath('/grievances\u007f')).toBeNull();
  });

  it('returns the normalized path, never the raw input', () => {
    expect(safeReturnPath('/a/../grievances')).toBe('/grievances');
  });

  it('rejects a path that only becomes //host once its dot segments are normalized', () => {
    expect(safeReturnPath('/grievances/../../..//evil.com')).toBeNull();
    expect(safeReturnPath('/a/..//evil.com')).toBeNull();
  });
});

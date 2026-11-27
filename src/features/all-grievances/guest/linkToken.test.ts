import { describe, expect, it, vi } from 'vitest';
import { readLinkToken, stripLinkToken } from './linkToken';

describe('readLinkToken', () => {
  it('reads the token after #k=', () => {
    expect(readLinkToken('#k=Xk3pQ9vT2mLr8WzA1bNc4e')).toBe('Xk3pQ9vT2mLr8WzA1bNc4e');
  });

  it('is null when there is no token or it is not one', () => {
    for (const hash of ['', '#', '#k=', '#k=short', '#k=<script>alert(1)</script>xxxxxxxxxx', '#x=Xk3pQ9vT2mLr8WzA1bNc4e']) {
      expect(readLinkToken(hash)).toBeNull();
    }
  });
});

describe('stripLinkToken', () => {
  it('replaces the history entry with the path and query only', () => {
    const replaceState = vi.fn();
    stripLinkToken({
      location: { pathname: '/g/3001002A0', search: '?lang=am' } as Location,
      history: { state: { idx: 1 }, replaceState } as unknown as History,
    });
    expect(replaceState).toHaveBeenCalledWith({ idx: 1 }, '', '/g/3001002A0?lang=am');
  });
});

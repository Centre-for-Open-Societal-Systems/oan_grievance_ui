import { describe, expect, it } from 'vitest';
import { isValidRequestId, newRequestId, requestIdFrom } from './requestId';

describe('request id', () => {
  it('mints a valid id where crypto.randomUUID is unavailable (plain http, non-localhost)', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(isValidRequestId(newRequestId())).toBe(true);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });

  it('mints a valid id', () => {
    expect(isValidRequestId(newRequestId())).toBe(true);
  });

  it('keeps a well-formed id from the caller and replaces anything else', () => {
    const good = 'abcd1234-ef56';
    expect(requestIdFrom(new Headers({ 'x-request-id': good }))).toBe(good);
    const replaced = requestIdFrom(new Headers({ 'x-request-id': 'bad id; forged: line' }));
    expect(replaced).not.toContain('forged');
    expect(isValidRequestId(replaced)).toBe(true);
  });
});

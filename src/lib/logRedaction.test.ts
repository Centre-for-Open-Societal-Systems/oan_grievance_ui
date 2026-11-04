import { describe, expect, it } from 'vitest';
import { redact, redactString, safePath } from './logRedaction';

describe('log redaction', () => {
  it('removes tokens, emails and long digit runs from text', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln';
    expect(redactString(`auth ${jwt} for a@b.com id 1234567890123`)).toBe('auth [redacted] for [redacted] id [redacted]');
    expect(redactString('Authorization: Bearer abc.def-123')).toContain('Bearer [redacted]');
  });

  it('drops sensitive keys by name, at any depth', () => {
    expect(redact({ status: 500, password: 'x', nested: { access_token: 't', ok: 1 } })).toEqual({
      status: 500,
      password: '[redacted]',
      nested: { access_token: '[redacted]', ok: 1 },
    });
  });

  it('keeps an Error to its name and message, without the stack', () => {
    expect(redact(new TypeError('boom'))).toEqual({ name: 'TypeError', message: 'boom' });
  });

  it('keeps only the path of a URL', () => {
    expect(safePath('/api/v1/grievances?q=jane%20doe&page=2#x')).toBe('/api/v1/grievances');
  });
});

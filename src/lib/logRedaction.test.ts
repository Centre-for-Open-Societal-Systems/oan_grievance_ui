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

  it('leaves a request id alone even when it is all digits (a Next error digest)', () => {
    expect(redact({ requestId: '1234567890', status: 500 })).toEqual({ requestId: '1234567890', status: 500 });
  });

  it('does not treat words that merely contain a short key as sensitive', () => {
    expect(redact({ footprint: 1, bypass: 2, otp: 3, session_id: 4, userOtp: 5, passcode: 6 })).toEqual({
      footprint: 1,
      bypass: 2,
      otp: '[redacted]',
      session_id: '[redacted]',
      userOtp: '[redacted]',
      passcode: '[redacted]',
    });
  });

  it('keeps the stack and own fields of an Error for server logs, scrubbed', () => {
    const error = Object.assign(new Error('failed for a@b.com'), {
      status: 502,
      responseData: { email: 'a@b.com', code: 'X' },
    });
    const out = redact(error, 0, { keepStack: true }) as Record<string, unknown>;
    expect(out).toMatchObject({
      name: 'Error',
      message: 'failed for [redacted]',
      status: 502,
      responseData: { email: '[redacted]', code: 'X' },
    });
    expect(typeof out.stack).toBe('string');
  });

  it('turns a Date, Headers and Response into readable values rather than {}', () => {
    expect(redact(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02T03:04:05.000Z');
    expect(redact(new Headers({ 'x-a': '1', authorization: 'Bearer abc' }))).toEqual({
      'x-a': '1',
      authorization: '[redacted]',
    });
    expect(redact(new Response('x', { status: 502 }))).toEqual({ status: 502, statusText: '' });
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { getClientIp, UNKNOWN_CLIENT_IP } from './clientIp';

const ORIGINAL_HOPS = process.env.TRUSTED_PROXY_HOPS;

afterEach(() => {
  if (ORIGINAL_HOPS === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = ORIGINAL_HOPS;
});

function requestWith(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/whatever', { headers });
}

describe('getClientIp — TRUSTED_PROXY_HOPS unset or 0 (the documented default)', () => {
  it('returns the constant "unknown" regardless of any forwarding headers present', () => {
    delete process.env.TRUSTED_PROXY_HOPS;
    expect(getClientIp(requestWith({ 'x-forwarded-for': '1.2.3.4' }))).toBe(UNKNOWN_CLIENT_IP);
    expect(getClientIp(requestWith({ 'x-real-ip': '1.2.3.4' }))).toBe(UNKNOWN_CLIENT_IP);
    expect(getClientIp(requestWith({}))).toBe(UNKNOWN_CLIENT_IP);
  });

  it('also returns "unknown" for an explicit 0', () => {
    process.env.TRUSTED_PROXY_HOPS = '0';
    expect(getClientIp(requestWith({ 'x-forwarded-for': '1.2.3.4' }))).toBe(UNKNOWN_CLIENT_IP);
  });

  it('treats invalid values (negative, non-numeric) the same as unset — never trusts an unparseable config', () => {
    for (const invalid of ['-1', 'not-a-number', '']) {
      process.env.TRUSTED_PROXY_HOPS = invalid;
      expect(getClientIp(requestWith({ 'x-forwarded-for': '1.2.3.4' }))).toBe(UNKNOWN_CLIENT_IP);
    }
  });
});

describe('getClientIp — TRUSTED_PROXY_HOPS configured', () => {
  it('picks the entry that many hops from the right of X-Forwarded-For', () => {
    process.env.TRUSTED_PROXY_HOPS = '1';
    // client, proxy1 — with 1 trusted hop, the rightmost entry is the proxy's
    // own view of the client, i.e. the second-to-last... actually the single
    // trusted-hop case takes the last entry (closest proxy's own client view).
    expect(getClientIp(requestWith({ 'x-forwarded-for': '203.0.113.5' }))).toBe('203.0.113.5');
  });

  it('with 2 trusted hops, picks the second-from-right entry', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(getClientIp(requestWith({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5');
  });

  it('clamps to MAX_TRUSTED_PROXY_HOPS (4) even if configured higher', () => {
    process.env.TRUSTED_PROXY_HOPS = '100';
    // 5-entry chain; hops clamped to 4, so it should pick index (5-4)=1, not blow up or read out of bounds.
    const chain = ['a', 'b', 'c', 'd', 'e'].join(', ');
    const result = getClientIp(requestWith({ 'x-forwarded-for': chain }));
    expect(result).toBe('b');
  });

  it('falls back to the nearest hop when the chain is shorter than configured hops', () => {
    process.env.TRUSTED_PROXY_HOPS = '3';
    expect(getClientIp(requestWith({ 'x-forwarded-for': '203.0.113.5' }))).toBe('203.0.113.5');
  });

  it('falls back to X-Real-IP when X-Forwarded-For is absent', () => {
    process.env.TRUSTED_PROXY_HOPS = '1';
    expect(getClientIp(requestWith({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('returns "unknown" when neither header is present, even with hops configured', () => {
    process.env.TRUSTED_PROXY_HOPS = '1';
    expect(getClientIp(requestWith({}))).toBe(UNKNOWN_CLIENT_IP);
  });
});

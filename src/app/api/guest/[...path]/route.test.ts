import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as route from './route';

const fetchMock = vi.fn();
const ORIGIN = 'http://localhost:3002';
let ticketSeq = 0;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** A ticket of its own per test: the rate limiter keeps its counts in memory across tests. */
function credentials(overrides: Record<string, unknown> = {}) {
  ticketSeq += 1;
  return { ticket_number: `30010${String(ticketSeq).padStart(3, '0')}0`, token: 'Xk3pQ9vT2mLr8WzA1bNc4e', pin: '482913', ...overrides };
}

function post(path: string, body: unknown, init: { origin?: string; cookie?: string; raw?: string } = {}) {
  const headers: Record<string, string> = { host: 'localhost:3002', 'content-type': 'application/json' };
  if (init.origin !== undefined) headers.origin = init.origin;
  if (init.cookie) headers.cookie = init.cookie;
  const request = new NextRequest(`${ORIGIN}/api/guest/${path}`, {
    method: 'POST',
    headers,
    body: init.raw ?? JSON.stringify(body),
  });
  return route.POST(request, { params: Promise.resolve({ path: path.split('/') }) });
}

describe('POST /api/guest/grievance', () => {
  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://backend.internal';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AUTH_API_BASE_URL;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('relays the checked link and PIN to the one backend route and returns the case', async () => {
    fetchMock.mockResolvedValue(json(200, { status: 'success', data: { ticket_number: '3-001-002A-0', status: 'Submitted' } }));
    const sent = credentials();

    const res = await post('grievance', sent, { origin: ORIGIN });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://backend.internal/api/v1/guest/grievance');
    expect(JSON.parse(init.body)).toEqual(sent);
    expect((init.headers as Headers).get('Authorization')).toBeNull();
    expect(res.status).toBe(200);
    expect((await res.json()).data.ticket_number).toBe('3-001-002A-0');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('forwards only the three fields, whatever else the body carries', async () => {
    fetchMock.mockResolvedValue(json(200, { status: 'success', data: {} }));
    const sent = credentials({ grievance: 'OTHER', is_internal: true });
    await post('grievance', sent, { origin: ORIGIN });
    expect(Object.keys(JSON.parse(fetchMock.mock.calls[0]![1].body)).sort()).toEqual(['pin', 'ticket_number', 'token']);
  });

  it('keeps nothing between calls: no cookie is set, and none is sent upstream', async () => {
    fetchMock.mockResolvedValue(json(200, { status: 'success', data: {} }));
    const res = await post('grievance', credentials(), { origin: ORIGIN, cookie: 'auth_token=abc' });
    expect(res.headers.getSetCookie()).toEqual([]);
    expect((fetchMock.mock.calls[0]![1].headers as Headers).get('cookie')).toBeNull();
  });

  it('refuses a body that is not the three fields, before the backend', async () => {
    for (const body of [{}, { ticket_number: 'x', token: 't' }, credentials({ pin: '1'.repeat(13) }), credentials({ token: 5 })]) {
      expect((await post('grievance', body, { origin: ORIGIN })).status).toBe(400);
    }
    expect((await post('grievance', null, { origin: ORIGIN, raw: 'not json' })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses an oversized body without reading it whole', async () => {
    const res = await post('grievance', null, { origin: ORIGIN, raw: JSON.stringify({ ...credentials(), pad: 'x'.repeat(2_000) }) });
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('limits attempts per address and ticket before they reach the backend', async () => {
    fetchMock.mockImplementation(async () => json(401, { status: 'error', code: 'GUEST_ACCESS_INVALID' }));
    const sent = credentials();
    const statuses = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await post('grievance', sent, { origin: ORIGIN })).status);
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(statuses[10]).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('relays a wrong PIN as the backend answers it', async () => {
    fetchMock.mockResolvedValue(json(401, { status: 'error', code: 'GUEST_ACCESS_INVALID', message: 'Check the SMS/Email for the correct PIN.' }));
    const res = await post('grievance', credentials(), { origin: ORIGIN });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('GUEST_ACCESS_INVALID');
  });

  it('refuses a cross-site POST before it reaches the backend', async () => {
    const res = await post('grievance', credentials(), { origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 404 for any other path, and offers no GET', async () => {
    for (const path of ['verify', 'grievance/message', 'grievance/attachments/abc/view', 'logout']) {
      expect((await post(path, credentials(), { origin: ORIGIN })).status).toBe(404);
    }
    expect('GET' in route).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 502 when the backend cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    expect((await post('grievance', credentials(), { origin: ORIGIN })).status).toBe(502);
  });
});

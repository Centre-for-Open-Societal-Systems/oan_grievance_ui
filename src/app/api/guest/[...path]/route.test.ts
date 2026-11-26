import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

const fetchMock = vi.fn();
const ORIGIN = 'http://localhost:3002';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function call(method: 'GET' | 'POST', path: string, init: { cookie?: string; body?: unknown; origin?: string } = {}) {
  const headers: Record<string, string> = { host: 'localhost:3002' };
  if (init.cookie) headers.cookie = init.cookie;
  if (init.origin) headers.origin = init.origin;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  const request = new NextRequest(`${ORIGIN}/api/guest/${path}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const handler = method === 'GET' ? GET : POST;
  return handler(request, { params: Promise.resolve({ path: path.split('?')[0]!.split('/') }) });
}

describe('/api/guest/*', () => {
  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://backend.internal';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AUTH_API_BASE_URL;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('keeps the session token from verify in an httpOnly, SameSite=Strict cookie and out of the body', async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        status: 'success',
        data: {
          session_token: 'secret-session',
          ticket_number: '3-001-002A-0',
          idle_timeout_seconds: 900,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
        },
      })
    );

    const res = await call('POST', 'verify', { body: { ticket_number: '3001002A0', token: 't', pin: '1' }, origin: ORIGIN });
    const body = await res.json();

    expect(fetchMock.mock.calls[0]![0]).toBe('http://backend.internal/api/v1/guest-access/verify');
    expect(JSON.stringify(body)).not.toContain('secret-session');
    expect(body.data.idle_timeout_seconds).toBe(900);
    const cookie = res.headers.getSetCookie().join('\n');
    expect(cookie).toMatch(/grievance_guest_session=secret-session/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(/Path=\/api\/guest/);
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('relays a wrong PIN as the backend answers it and sets no cookie', async () => {
    fetchMock.mockResolvedValue(json(401, { status: 'error', code: 'GUEST_ACCESS_INVALID', message: 'Check the SMS/Email for the correct PIN.' }));
    const res = await call('POST', 'verify', { body: { ticket_number: 'x', token: 't', pin: '1' }, origin: ORIGIN });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('GUEST_ACCESS_INVALID');
    expect(res.headers.getSetCookie().join('\n')).not.toMatch(/grievance_guest_session=[^;]/);
  });

  it('refuses a cross-site POST before it reaches the backend', async () => {
    const res = await call('POST', 'verify', { body: { pin: '1' }, origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 404 for any path not on the list, without calling the backend', async () => {
    for (const [method, path] of [
      ['GET', 'grievance/timeline'],
      ['POST', 'grievance'],
      ['GET', 'verify'],
      ['GET', '../proxy/api/v1/grievances'],
    ] as const) {
      expect((await call(method, path)).status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the session in its own header, never as a bearer token, and relays only allowed query keys', async () => {
    fetchMock.mockResolvedValue(json(200, { status: 'success', data: {} }));
    await call('GET', 'grievance?cursor=c1&grievance=OTHER', { cookie: 'grievance_guest_session=abc' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://backend.internal/api/v1/guest/grievance?cursor=c1');
    const headers = init.headers as Headers;
    expect(headers.get('X-Grievance-Guest-Session')).toBe('abc');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('maps an attachment view onto the backend route', async () => {
    fetchMock.mockResolvedValue(new Response('bytes', { status: 200, headers: { 'content-type': 'image/png' } }));
    const res = await call('GET', 'grievance/attachments/abc123/view', { cookie: 'grievance_guest_session=abc' });
    expect(fetchMock.mock.calls[0]![0]).toBe('http://backend.internal/api/v1/guest/grievance/attachments/abc123/view');
    expect(res.status).toBe(200);
  });

  it('clears the cookie once the backend says the session is over or the case closed', async () => {
    for (const [status, code] of [
      [401, 'GUEST_SESSION_EXPIRED'],
      [410, 'GUEST_ACCESS_CLOSED'],
    ] as const) {
      fetchMock.mockResolvedValueOnce(json(status, { status: 'error', code }));
      const res = await call('GET', 'grievance', { cookie: 'grievance_guest_session=abc' });
      expect(res.status).toBe(status);
      expect(res.headers.getSetCookie().join('\n')).toMatch(/grievance_guest_session=;.*Max-Age=0/);
    }
  });

  it('clears the cookie on logout', async () => {
    fetchMock.mockResolvedValue(json(200, { status: 'success', data: { ended: true } }));
    const res = await call('POST', 'logout', { cookie: 'grievance_guest_session=abc', origin: ORIGIN });
    expect(fetchMock.mock.calls[0]![0]).toBe('http://backend.internal/api/v1/guest-access/logout');
    expect(res.headers.getSetCookie().join('\n')).toMatch(/grievance_guest_session=;.*Max-Age=0/);
  });

  it('answers 502 when the backend cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    expect((await call('GET', 'grievance', { cookie: 'grievance_guest_session=abc' })).status).toBe(502);
  });
});

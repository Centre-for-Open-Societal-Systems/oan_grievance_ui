import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

const fetchMock = vi.fn();
const ORIGIN = 'http://localhost:3002';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function call(method: 'GET' | 'POST', path: string, init: { body?: unknown; origin?: string; cookie?: string } = {}) {
  const headers: Record<string, string> = { host: 'localhost:3002' };
  if (init.origin) headers.origin = init.origin;
  if (init.cookie) headers.cookie = init.cookie;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  const request = new NextRequest(`${ORIGIN}/api/guest/${path}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return (method === 'GET' ? GET : POST)(request, { params: Promise.resolve({ path: path.split('/') }) });
}

const CREDENTIALS = { ticket_number: '3001002A0', token: 'Xk3pQ9vT2mLr8WzA1bNc4e', pin: '482913' };

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

  it('relays the link and PIN in the body to the one backend route and returns the case', async () => {
    fetchMock.mockResolvedValue(json(200, { status: 'success', data: { ticket_number: '3-001-002A-0', status: 'Submitted' } }));

    const res = await call('POST', 'grievance', { body: CREDENTIALS, origin: ORIGIN });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://backend.internal/api/v1/guest/grievance');
    expect(await new Response(init.body).json()).toEqual(CREDENTIALS);
    expect((init.headers as Headers).get('Authorization')).toBeNull();
    expect(res.status).toBe(200);
    expect((await res.json()).data.ticket_number).toBe('3-001-002A-0');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('keeps nothing between calls: no cookie is set, and none is sent upstream', async () => {
    fetchMock.mockResolvedValue(json(200, { status: 'success', data: {} }));
    const res = await call('POST', 'grievance', { body: CREDENTIALS, origin: ORIGIN, cookie: 'auth_token=abc' });
    expect(res.headers.getSetCookie()).toEqual([]);
    const headers = fetchMock.mock.calls[0]![1].headers as Headers;
    expect(headers.get('cookie')).toBeNull();
  });

  it('relays a wrong PIN as the backend answers it', async () => {
    fetchMock.mockResolvedValue(json(401, { status: 'error', code: 'GUEST_ACCESS_INVALID', message: 'Check the SMS/Email for the correct PIN.' }));
    const res = await call('POST', 'grievance', { body: CREDENTIALS, origin: ORIGIN });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('GUEST_ACCESS_INVALID');
  });

  it('refuses a cross-site POST before it reaches the backend', async () => {
    const res = await call('POST', 'grievance', { body: CREDENTIALS, origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 404 for anything but POST grievance, without calling the backend', async () => {
    for (const [method, path] of [
      ['GET', 'grievance'],
      ['POST', 'verify'],
      ['POST', 'grievance/message'],
      ['GET', 'grievance/attachments/abc/view'],
      ['POST', 'logout'],
    ] as const) {
      expect((await call(method, path)).status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 502 when the backend cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    expect((await call('POST', 'grievance', { body: CREDENTIALS, origin: ORIGIN })).status).toBe(502);
  });
});

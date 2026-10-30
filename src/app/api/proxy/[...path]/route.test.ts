import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { backendResponse, iamSessionCookies, iamToken, STAFF_OPTION } from '@/lib/iamTestFixtures';
import { GET } from './route';

function get(cookies: Record<string, string>) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return GET(new NextRequest('http://localhost:3000/api/proxy/api/v1/auth/me', { headers: { cookie } }), {
    params: Promise.resolve({ path: ['api', 'v1', 'auth', 'me'] }),
  });
}

const fetchMock = vi.fn();

const ok = () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
const withToken = (token: string) => iamSessionCookies(STAFF_OPTION, token);

describe('/api/proxy with an IAM session', () => {
  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://auth.internal';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AUTH_API_BASE_URL;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("sends IAM's access token to the backend as a Bearer token, and no browser cookies", async () => {
    const token = iamToken();
    fetchMock.mockResolvedValue(ok());

    const res = await get(withToken(token));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = new Headers(fetchMock.mock.calls[0]![1].headers);
    expect(headers.get('authorization')).toBe(`Bearer ${token}`);
    expect(headers.get('cookie')).toBeNull();
  });

  it('renews an expired token through the backend before the call, and relays the new cookie', async () => {
    const expired = iamToken('kc-user-1', -60);
    const fresh = iamToken('kc-user-1', 300);
    fetchMock
      .mockResolvedValueOnce(backendResponse(200, { refreshed: true }, [`X-Access-Token=${fresh}; Path=/; Max-Age=2100`]))
      .mockResolvedValueOnce(
        backendResponse(200, { user: 'u1', roles: ['Grievance Officer'], login_option: 'staff', cookie_prefix: '' })
      )
      .mockResolvedValueOnce(ok());

    const res = await get(withToken(expired));

    expect(fetchMock.mock.calls[0]![0]).toBe('http://auth.internal/api/v1/auth/refresh');
    expect(new Headers(fetchMock.mock.calls[2]![1].headers).get('authorization')).toBe(`Bearer ${fresh}`);
    expect(res.headers.getSetCookie().join('\n')).toContain(`X-Access-Token=${fresh}`);
  });

  it('ends the session when IAM will not renew it', async () => {
    fetchMock.mockResolvedValueOnce(backendResponse(401, 'over'));

    const res = await get(withToken(iamToken('kc-user-1', -60)));

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.headers.getSetCookie().join('\n')).toMatch(/login_option=;.*Max-Age=0/);
  });

  it('answers 503 without ending the session when IAM is down', async () => {
    fetchMock.mockResolvedValueOnce(backendResponse(503, 'down'));

    const res = await get(withToken(iamToken('kc-user-1', -60)));

    expect(res.status).toBe(503);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('does not retry a 401 when the token comes back unchanged', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(backendResponse(200, { refreshed: false }));

    const res = await get(withToken(iamToken()));

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not apply this app's idle clock to an IAM session opened at another app (single sign-on)", async () => {
    // No `last_activity`: the session was opened at the registry, not here.
    fetchMock.mockResolvedValue(ok());

    const res = await get(withToken(iamToken()));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('idles out a local session without touching the IAM session the browser also holds', async () => {
    const res = await get({ auth_token: 'a.b.c', refresh_token: 'r', ...withToken(iamToken()) });
    const cookies = res.headers.getSetCookie().join('\n');

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cookies).toMatch(/refresh_token=;.*Max-Age=0/);
    expect(cookies).not.toContain('X-Access-Token');
    expect(cookies).not.toContain('login_option');
  });
});

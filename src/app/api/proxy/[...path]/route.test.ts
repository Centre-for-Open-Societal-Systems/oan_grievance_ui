import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function iamToken(expOffsetSeconds: number): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256' })}.${encode({
    sub: 'kc-user-1',
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    resource_access: { 'oan-grievance': { roles: ['Grievance Officer'] } },
  })}.sig`;
}

function get(cookies: Record<string, string>) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return GET(new NextRequest('http://localhost:3000/api/proxy/api/v1/auth/me', { headers: { cookie } }), {
    params: Promise.resolve({ path: ['api', 'v1', 'auth', 'me'] }),
  });
}

const fetchMock = vi.fn();

describe('/api/proxy with a staff (IAM) session', () => {
  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://auth.internal';
    process.env.IAM_BASE_URL = 'http://iam.internal:8020';
    process.env.IAM_LOGIN_PROVIDER_ID = '1';
    process.env.IAM_APPLICATION = 'oan-grievance';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AUTH_API_BASE_URL;
    delete process.env.IAM_BASE_URL;
    delete process.env.IAM_LOGIN_PROVIDER_ID;
    delete process.env.IAM_APPLICATION;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("sends IAM's access token to the backend as a Bearer token", async () => {
    const token = iamToken(300);
    fetchMock.mockResolvedValue(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

    const res = await get({ 'X-Access-Token': token, 'X-Session-Id': 'sid', last_activity: '1' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).get('authorization')).toBe(`Bearer ${token}`);
  });

  it('renews an expired token through IAM before calling the backend, and relays the new cookie', async () => {
    const expired = iamToken(-60);
    const fresh = iamToken(300);
    fetchMock
      .mockResolvedValueOnce(
        new Response('{}', { status: 200, headers: { 'set-cookie': `X-Access-Token=${fresh}; Path=/; Max-Age=2100` } })
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

    const res = await get({ 'X-Access-Token': expired, 'X-Session-Id': 'sid', last_activity: '1' });

    expect(fetchMock.mock.calls[0]![0]).toBe('http://iam.internal:8020/auth/get_user_profile');
    expect(new Headers(fetchMock.mock.calls[1]![1].headers).get('authorization')).toBe(`Bearer ${fresh}`);
    expect(res.headers.getSetCookie().join('\n')).toContain(`X-Access-Token=${fresh}`);
  });

  it('ends the session when IAM will not renew it', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));

    const res = await get({ 'X-Access-Token': iamToken(-60), 'X-Session-Id': 'sid', last_activity: '1' });

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.headers.getSetCookie().join('\n')).toMatch(/X-Session-Id=;.*Max-Age=0/);
  });

  it("does not apply this app's idle clock to a staff session opened at another app (single sign-on)", async () => {
    // No `last_activity`: the session was opened at the registry, not here.
    fetchMock.mockResolvedValue(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

    const res = await get({ 'X-Access-Token': iamToken(300), 'X-Session-Id': 'sid' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('idles out a local session without touching the IAM session the browser also holds', async () => {
    const res = await get({ auth_token: 'a.b.c', refresh_token: 'r', 'X-Access-Token': iamToken(300) });
    const cookies = res.headers.getSetCookie().join('\n');

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cookies).toMatch(/refresh_token=;.*Max-Age=0/);
    expect(cookies).not.toContain('X-Access-Token');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const fetchMock = vi.fn();

// A staff token holding a role on this app's client — see `hasAppAccess`.
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const STAFF_TOKEN = `${encode({ alg: 'RS256' })}.${encode({
  sub: 'kc-user-1',
  exp: Math.floor(Date.now() / 1000) + 300,
  resource_access: { 'oan-grievance': { roles: ['Grievance Officer'] } },
})}.sig`;
// Signed in at the registry only: no role on this app's client, so a guest here.
const REGISTRY_ONLY_TOKEN = `${encode({ alg: 'RS256' })}.${encode({
  sub: 'kc-user-2',
  exp: Math.floor(Date.now() / 1000) + 300,
  resource_access: { 'openg2p-registry': { roles: ['Registry Operator'] } },
})}.sig`;

function logout(cookies: Record<string, string>, body: object = {}) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return POST(
    new NextRequest('http://localhost:3002/api/auth/logout', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${Math.random()}` },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/auth/logout with a staff (IAM) session', () => {
  beforeEach(() => {
    process.env.IAM_BASE_URL = 'http://iam.internal:8020';
    process.env.IAM_LOGIN_PROVIDER_ID = '1';
    process.env.IAM_APPLICATION = 'oan-grievance';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.IAM_BASE_URL;
    delete process.env.IAM_LOGIN_PROVIDER_ID;
    delete process.env.IAM_APPLICATION;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("returns the provider's logout URL pointing back at the requested page, and clears IAM's cookies", async () => {
    const headers = new Headers({
      location: 'https://kc.example.org/logout?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F&client_id=c',
    });
    headers.append('set-cookie', 'X-Access-Token=""; Max-Age=0; Path=/');
    fetchMock.mockResolvedValue(new Response(null, { status: 307, headers }));

    const res = await logout({ 'X-Access-Token': STAFF_TOKEN, 'X-Session-Id': 'sid' }, { returnTo: '/login?reason=idle' });
    const body = await res.json();

    expect(fetchMock.mock.calls[0]![0]).toBe('http://iam.internal:8020/auth/logout');
    expect(new URL(body.redirectTo).searchParams.get('post_logout_redirect_uri')).toBe(
      'http://localhost:3002/login?reason=idle'
    );
    expect(res.headers.getSetCookie().join('\n')).toMatch(/X-Session-Id=;.*Max-Age=0/);
  });

  it('never sends the provider anywhere off-site', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 307, headers: { location: 'https://kc.example.org/logout' } })
    );
    const body = await (await logout({ 'X-Access-Token': STAFF_TOKEN }, { returnTo: 'https://evil.example' })).json();
    expect(new URL(body.redirectTo).searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3002/login');
  });

  it('still ends the session here when IAM is down', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await logout({ 'X-Access-Token': 'a.b.c', 'X-Session-Id': 'sid' });
    expect(res.status).toBe(200);
    expect((await res.json()).redirectTo).toBeNull();
    expect(res.headers.getSetCookie().join('\n')).toMatch(/X-Access-Token=;.*Max-Age=0/);
  });

  it('ends a single sign-on session this app does not accept, so another account can sign in', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 307, headers: { location: 'https://kc.example.org/logout' } })
    );
    const body = await (await logout({ 'X-Access-Token': REGISTRY_ONLY_TOKEN, 'X-Session-Id': 'sid' })).json();
    expect(fetchMock.mock.calls[0]![0]).toBe('http://iam.internal:8020/auth/logout');
    expect(new URL(body.redirectTo).searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3002/login');
  });

  it('has no provider logout for a local session', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    process.env.AUTH_API_BASE_URL = 'http://auth.internal';
    const body = await (await logout({ refresh_token: 'r' })).json();
    expect(body.redirectTo).toBeNull();
    delete process.env.AUTH_API_BASE_URL;
  });
});

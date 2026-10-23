import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { backendResponse, iamSessionCookies, STAFF_OPTION } from '@/lib/iamTestFixtures';
import { POST } from './route';

const fetchMock = vi.fn();

function logout(cookies: Record<string, string>) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return POST(
    new NextRequest('http://localhost:3002/api/auth/logout', {
      method: 'POST',
      headers: { cookie, 'x-forwarded-for': `10.1.0.${Math.random()}` },
    })
  );
}

describe('POST /api/auth/logout with an IAM session', () => {
  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://auth.internal/api';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AUTH_API_BASE_URL;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("ends the session through the backend, relays IAM's clearing cookies and returns the provider logout URL", async () => {
    fetchMock.mockResolvedValue(
      backendResponse(200, { logged_out: true, provider_logout: false, logout_url: 'https://kc.example.org/logout' }, [
        'X-Session-Id=; Max-Age=0; Domain=.example.org; Path=/',
      ])
    );

    const res = await logout(iamSessionCookies());
    const body = await res.json();

    expect(fetchMock.mock.calls[0]![0]).toBe('http://auth.internal/api/v1/auth/logout');
    expect(body).toMatchObject({ redirectTo: 'https://kc.example.org/logout', providerLoggedOut: false });
    const cookies = res.headers.getSetCookie().join('\n');
    expect(cookies).toMatch(/X-Session-Id=;.*Domain=.example.org/);
    expect(cookies).toMatch(/login_option=;.*Max-Age=0/);
  });

  it('has nothing to navigate to when the provider was signed out server-side', async () => {
    fetchMock.mockResolvedValue(backendResponse(200, { logged_out: true, provider_logout: true }));
    const body = await (await logout(iamSessionCookies())).json();
    expect(body).toMatchObject({ redirectTo: null, providerLoggedOut: true });
  });

  it('still ends the session here when the backend is down', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await logout(iamSessionCookies());
    expect(res.status).toBe(200);
    expect((await res.json()).redirectTo).toBeNull();
    expect(res.headers.getSetCookie().join('\n')).toMatch(/login_option=;.*Max-Age=0/);
  });

  it('ends a single sign-on session this app does not accept, so another account can sign in', async () => {
    fetchMock.mockResolvedValue(backendResponse(200, { logged_out: true, provider_logout: true }));
    await logout(iamSessionCookies({ ...STAFF_OPTION, roles: [] }));
    expect(fetchMock.mock.calls[0]![0]).toBe('http://auth.internal/api/v1/auth/logout');
  });

  it('has no provider logout for a local session', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    const body = await (await logout({ refresh_token: 'r' })).json();
    expect(body.redirectTo).toBeNull();
  });
});

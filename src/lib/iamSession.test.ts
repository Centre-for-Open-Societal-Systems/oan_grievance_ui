import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { decodeIamAccessToken } from '@/lib/jwt';
import {
  applyIamCookies,
  expireIamCookies,
  forwardIamCallback,
  readIamSession,
  refreshIamSession,
  revokeIamSession,
  startIamLogin,
} from './iamSession';

const APP = 'oan-grievance';

function iamToken(claims: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256' })}.${encode({ sub: 'kc-user-1', exp: Math.floor(Date.now() / 1000) + 300, ...claims })}.sig`;
}

function requestWith(cookies: Record<string, string>) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return new NextRequest('http://localhost:3000/x', { headers: { cookie } });
}

function iamResponse(status: number, setCookies: string[] = [], init: { body?: string; location?: string } = {}) {
  const headers = new Headers();
  for (const c of setCookies) headers.append('set-cookie', c);
  if (init.location) headers.set('location', init.location);
  return new Response(init.body ?? null, { status, headers });
}

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.IAM_BASE_URL = 'http://iam.internal:8020/';
  process.env.IAM_LOGIN_PROVIDER_ID = '1';
  process.env.IAM_APPLICATION = APP;
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  delete process.env.IAM_BASE_URL;
  delete process.env.IAM_LOGIN_PROVIDER_ID;
  delete process.env.IAM_APPLICATION;
  delete process.env.IAM_COOKIE_PREFIX;
  delete process.env.IAM_COOKIE_DOMAIN;
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('decodeIamAccessToken', () => {
  it("reads roles from this app's client only, and shows the email", () => {
    const token = iamToken({
      email: 'officer@moa.gov.et',
      resource_access: { [APP]: { roles: ['Grievance Officer'] }, other: { roles: ['Grievance Admin'] } },
    });
    expect(decodeIamAccessToken(token, APP)).toMatchObject({ sub: 'officer@moa.gov.et', roles: ['Grievance Officer'] });
  });

  it('gives no roles when the token has none for this app', () => {
    expect(decodeIamAccessToken(iamToken({}), APP)?.roles).toEqual([]);
  });
});

describe('readIamSession', () => {
  it('is null when staff sign-in is not configured', () => {
    delete process.env.IAM_BASE_URL;
    expect(readIamSession(requestWith({ 'X-Access-Token': iamToken({}) }))).toBeNull();
  });

  it('honours the IAM cookie prefix', () => {
    process.env.IAM_COOKIE_PREFIX = 'agent-';
    const token = iamToken({});
    expect(readIamSession(requestWith({ 'X-Access-Token': token }))).toBeNull();
    expect(readIamSession(requestWith({ 'agent-X-Access-Token': token, 'agent-X-Session-Id': 'sid' }))).toMatchObject({
      accessToken: token,
      sessionId: 'sid',
    });
  });
});

describe('startIamLogin', () => {
  it('opens a transaction for the configured provider and returns the provider URL', async () => {
    fetchMock.mockResolvedValue(
      iamResponse(200, [], { body: JSON.stringify({ redirectUrl: 'https://kc.example.org/auth?x=1', state: 's' }) })
    );

    await expect(startIamLogin('http://localhost:3000/api/auth/staff/complete', '1.2.3.4')).resolves.toBe('https://kc.example.org/auth?x=1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      'http://iam.internal:8020/auth/start_authentication_transaction?id=1&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fstaff%2Fcomplete'
    );
    expect(init.method).toBe('POST');
  });

  it('returns null when IAM refuses', async () => {
    fetchMock.mockResolvedValue(iamResponse(401, [], { body: '{"error":"Invalid Login Provider Id"}' }));
    await expect(startIamLogin('/', 'ip')).resolves.toBeNull();
  });
});

describe('forwardIamCallback', () => {
  it("returns IAM's cookies and redirect once it opened a session", async () => {
    const token = iamToken({});
    fetchMock.mockResolvedValue(
      iamResponse(307, ['X-Access-Token=""; Max-Age=0; Path=/', `X-Access-Token=${token}; Max-Age=2100; Path=/; HttpOnly`], {
        location: '/all-grievances',
      })
    );

    const result = await forwardIamCallback('?code=c&state=s', 'ip');
    expect(result).toMatchObject({ accessToken: token, location: '/all-grievances' });
    expect(fetchMock.mock.calls[0]![0]).toBe('http://iam.internal:8020/auth/callback?code=c&state=s');
    expect(fetchMock.mock.calls[0]![1].redirect).toBe('manual');
  });

  it('returns null when IAM rejects the state', async () => {
    fetchMock.mockResolvedValue(iamResponse(401));
    await expect(forwardIamCallback('?code=c&state=bad', 'ip')).resolves.toBeNull();
  });
});

describe('refreshIamSession', () => {
  const session = { accessToken: 'old.token.x', sessionId: 'sid-1', claims: null };

  it("sends IAM's own cookies and picks the renewed token out of its Set-Cookie", async () => {
    const fresh = iamToken({});
    fetchMock.mockResolvedValue(iamResponse(200, [`X-Access-Token=${fresh}; Max-Age=2100; Path=/`]));

    const renewed = await refreshIamSession(session, 'ip');
    expect(renewed?.accessToken).toBe(fresh);
    expect(fetchMock.mock.calls[0]![0]).toBe('http://iam.internal:8020/auth/get_user_profile');
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).get('cookie')).toBe(
      'X-Access-Token=old.token.x; X-Session-Id=sid-1'
    );
  });

  it('keeps the token when IAM did not need to renew it', async () => {
    fetchMock.mockResolvedValue(iamResponse(200));
    await expect(refreshIamSession(session, 'ip')).resolves.toMatchObject({ accessToken: 'old.token.x' });
  });

  it('is null once IAM has ended the session', async () => {
    fetchMock.mockResolvedValue(iamResponse(401));
    await expect(refreshIamSession(session, 'ip')).resolves.toBeNull();
  });

  it('does not call IAM without a session id to refresh from', async () => {
    await expect(refreshIamSession({ ...session, sessionId: undefined }, 'ip')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('revokeIamSession', () => {
  const session = { accessToken: 't.t.t', sessionId: 'sid', idToken: 'id.t.t', claims: null };

  it("hands back the provider's logout URL, returning the browser here instead of IAM's portal", async () => {
    fetchMock.mockResolvedValue(
      iamResponse(307, ['X-Access-Token=""; Max-Age=0; Path=/'], {
        location:
          'https://kc.example.org/realms/staff/protocol/openid-connect/logout?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F&id_token_hint=id.t.t&client_id=iam-staff-portal',
      })
    );

    const result = await revokeIamSession(session, 'http://localhost:3002/login', 'ip');

    expect(result.setCookies).toHaveLength(1);
    const url = new URL(result.providerLogoutUrl!);
    expect(url.origin + url.pathname).toBe('https://kc.example.org/realms/staff/protocol/openid-connect/logout');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3002/login');
    expect(url.searchParams.get('id_token_hint')).toBe('id.t.t');
    expect(url.searchParams.get('client_id')).toBe('iam-staff-portal');
    // Not followed server-side, and IAM gets the ID token it needs for `id_token_hint`.
    expect(fetchMock.mock.calls[0]![1].redirect).toBe('manual');
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).get('cookie')).toContain('X-ID-Token=id.t.t');
  });

  it('never throws when IAM is down', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(revokeIamSession(session, 'http://localhost:3002/login', 'ip')).resolves.toEqual({
      setCookies: [],
      providerLogoutUrl: null,
    });
  });
});

describe('cookie relay', () => {
  it("re-emits IAM's cookies with their domain and flags", () => {
    const response = NextResponse.json({});
    applyIamCookies(response, ['X-Access-Token=abc; Domain=.example.org; Path=/; Max-Age=2100; HttpOnly; Secure']);
    const header = response.headers.get('set-cookie')!;
    expect(header).toContain('X-Access-Token=abc');
    expect(header).toContain('Domain=.example.org');
    expect(header).toMatch(/HttpOnly/i);
  });

  it('expires every IAM cookie on the configured domain', () => {
    process.env.IAM_COOKIE_DOMAIN = '.example.org';
    const response = NextResponse.json({});
    expireIamCookies(response);
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(4);
    for (const c of cookies) expect(c).toMatch(/Domain=\.example\.org.*Max-Age=0|Max-Age=0.*Domain=\.example\.org/);
  });
});

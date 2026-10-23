import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import {
  adoptIamSession,
  applyIamCookies,
  fetchLoginProviders,
  hasAppAccess,
  isAccessTokenDropped,
  lookupIamUser,
  needsIamAdoption,
  readIamSession,
  renewIamSession,
  resetLoginProvidersCache,
  revokeIamSession,
  startIamLogin,
} from './iamSession';
import { backendResponse, cookieRequest, iamSessionCookies, iamToken, STAFF_OPTION } from './iamTestFixtures';
import { decodeLoginOption, encodeLoginOption } from './loginOption';

const fetchMock = vi.fn();
const URL_ = 'http://localhost:3000/x';

function sentTo(call = 0): { url: string; init: RequestInit & { headers: Record<string, string> } } {
  const [url, init] = fetchMock.mock.calls[call]!;
  return { url, init };
}

beforeEach(() => {
  process.env.AUTH_API_BASE_URL = 'http://auth.internal/api';
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  delete process.env.AUTH_API_BASE_URL;
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  resetLoginProvidersCache();
});

describe('readIamSession', () => {
  it("reads only the cookies under the recorded option's prefix", () => {
    const agent = { ...STAFF_OPTION, key: 'agent', cookie_prefix: 'agent-' };
    const request = cookieRequest(URL_, { ...iamSessionCookies(agent), 'X-Access-Token': iamToken('staff-user') });
    const session = readIamSession(request)!;
    expect(session.option.key).toBe('agent');
    expect(session.token?.sub).toBe('kc-user-1');
  });

  it('is null without a login option, whatever IAM cookies are present', () => {
    expect(readIamSession(cookieRequest(URL_, { 'X-Access-Token': iamToken() }))).toBeNull();
  });

  it('counts as access here only for the account the roles were looked up for', () => {
    const request = cookieRequest(URL_, iamSessionCookies(STAFF_OPTION, iamToken('someone-else')));
    expect(hasAppAccess(readIamSession(request)!)).toBe(false);
    expect(hasAppAccess(readIamSession(cookieRequest(URL_, iamSessionCookies()))!)).toBe(true);
    const noRoles = cookieRequest(URL_, iamSessionCookies({ ...STAFF_OPTION, roles: [] }));
    expect(hasAppAccess(readIamSession(noRoles)!)).toBe(false);
  });

  it('tells a dropped (too large) access-token cookie from a missing session', () => {
    const option = { key: 'staff', cookie_prefix: '' };
    expect(isAccessTokenDropped(cookieRequest(URL_, { 'X-ID-Token': 'id' }), option)).toBe(true);
    expect(isAccessTokenDropped(cookieRequest(URL_, {}), option)).toBe(false);
  });
});

describe('login_option cookie', () => {
  it('round-trips and refuses anything this app did not write', () => {
    expect(decodeLoginOption(encodeLoginOption(STAFF_OPTION))).toEqual(STAFF_OPTION);
    expect(decodeLoginOption('not-json')).toBeNull();
    expect(decodeLoginOption(Buffer.from('{"key":""}').toString('base64url'))).toBeNull();
  });
});

describe('startIamLogin', () => {
  it('asks the backend, never IAM, and returns the provider URL and option', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { redirect_url: 'https://kc.example.org/auth', iam: 'staff', cookie_prefix: '' })
    );
    const result = await startIamLogin('staff', 'http://localhost:3000/api/auth/iam/complete', '1.2.3.4');
    expect(result).toEqual({ ok: true, redirectUrl: 'https://kc.example.org/auth', option: { key: 'staff', cookie_prefix: '' } });
    const { url, init } = sentTo();
    expect(url).toBe('http://auth.internal/api/v1/auth/iam/login');
    expect(JSON.parse(init.body as string)).toEqual({ key: 'staff', return_url: 'http://localhost:3000/api/auth/iam/complete' });
  });

  it('refuses a redirect that is not https (http only on localhost)', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { redirect_url: 'http://kc.example.org/auth', iam: 'staff', cookie_prefix: '' })
    );
    expect(await startIamLogin('staff', 'x', 'ip')).toEqual({ ok: false, reason: 'failed' });
  });

  it.each([
    [400, 'not_offered'],
    [502, 'failed'],
    [503, 'unavailable'],
  ])('maps a %i to %s', async (status, reason) => {
    fetchMock.mockResolvedValueOnce(backendResponse(status, 'nope'));
    expect(await startIamLogin('staff', 'x', 'ip')).toEqual({ ok: false, reason });
  });
});

describe('lookupIamUser', () => {
  it('sends the token as Bearer, and records the roles from /me, not the token', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { user: 'u1', login_email: 'a@b.c', roles: ['Grievance Officer'], login_option: 'staff', cookie_prefix: '' })
    );
    const token = iamToken();
    const result = await lookupIamUser(token, 'ip');
    expect(result).toEqual({
      status: 'ok',
      option: { key: 'staff', cookie_prefix: '', sub: 'kc-user-1', user: 'a@b.c', roles: ['Grievance Officer'] },
    });
    const { url, init } = sentTo();
    expect(url).toBe('http://auth.internal/api/v1/auth/me');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe(`Bearer ${token}`);
    expect(init.headers.Cookie).toBeUndefined();
  });

  it("treats this app's own token, a 401 and a 503 differently", async () => {
    fetchMock.mockResolvedValueOnce(backendResponse(200, { user: 'u1', roles: [], login_option: 'local', cookie_prefix: null }));
    expect((await lookupIamUser(iamToken(), 'ip')).status).toBe('unauthorized');
    fetchMock.mockResolvedValueOnce(backendResponse(401, 'no'));
    expect((await lookupIamUser(iamToken(), 'ip')).status).toBe('unauthorized');
    fetchMock.mockResolvedValueOnce(backendResponse(503, 'down'));
    expect((await lookupIamUser(iamToken(), 'ip')).status).toBe('unavailable');
  });
});

describe('renewIamSession', () => {
  it("forwards only the option's cookies, then looks the user up again", async () => {
    const fresh = iamToken('kc-user-1', 600);
    fetchMock
      .mockResolvedValueOnce(backendResponse(200, { refreshed: true }, [`X-Access-Token=${fresh}; Path=/; Domain=.example.org`]))
      .mockResolvedValueOnce(
        backendResponse(200, { user: 'u1', roles: ['Grievance Admin'], login_option: 'staff', cookie_prefix: '' })
      );
    const expired = iamToken('kc-user-1', -60);
    const request = cookieRequest(URL_, {
      ...iamSessionCookies(STAFF_OPTION, expired),
      'agent-X-Access-Token': 'other',
      auth_token: 'local',
    });

    const result = await renewIamSession(readIamSession(request)!, request, 'ip');

    expect(result).toMatchObject({ status: 'ok', accessToken: fresh, refreshed: true, option: { roles: ['Grievance Admin'] } });
    const { url, init } = sentTo();
    expect(url).toBe('http://auth.internal/api/v1/auth/refresh');
    expect(JSON.parse(init.body as string)).toEqual({ access_token: expired });
    expect(init.headers.Cookie).toBe(`X-Access-Token=${expired}; X-Session-Id=sid`);
  });

  it('keeps the token and roles when IAM says the token was still valid', async () => {
    fetchMock.mockResolvedValueOnce(backendResponse(200, { refreshed: false }));
    const request = cookieRequest(URL_, iamSessionCookies());
    const result = await renewIamSession(readIamSession(request)!, request, 'ip');
    expect(result).toMatchObject({ status: 'ok', refreshed: false, option: STAFF_OPTION });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ends on a 401 (relaying the cookies IAM cleared) and keeps the session on a 503', async () => {
    fetchMock.mockResolvedValueOnce(backendResponse(401, 'over', ['X-Access-Token=; Max-Age=0; Path=/']));
    const request = cookieRequest(URL_, iamSessionCookies());
    expect(await renewIamSession(readIamSession(request)!, request, 'ip')).toEqual({
      status: 'ended',
      setCookies: ['X-Access-Token=; Max-Age=0; Path=/'],
    });
    fetchMock.mockResolvedValueOnce(backendResponse(503, 'down'));
    expect(await renewIamSession(readIamSession(request)!, request, 'ip')).toEqual({ status: 'unavailable' });
  });
});

describe('adoptIamSession', () => {
  it('looks up each IAM access cookie by itself and records the matching option', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { user: 'u1', roles: ['Grievance Officer'], login_option: 'agent', cookie_prefix: 'agent-' })
    );
    const token = iamToken('kc-agent');
    const request = cookieRequest(URL_, { 'agent-X-Access-Token': token, 'agent-X-Session-Id': 'sid' });

    expect(needsIamAdoption(request)).toBe(true);
    const adopted = await adoptIamSession(request, 'ip');

    expect(adopted).toMatchObject({ accessToken: token, option: { key: 'agent', cookie_prefix: 'agent-', sub: 'kc-agent' } });
    expect(sentTo().init.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it('refreshes an expired token first, through the backend', async () => {
    const fresh = iamToken('kc-user-1', 600);
    fetchMock
      .mockResolvedValueOnce(backendResponse(200, { refreshed: true }, [`X-Access-Token=${fresh}; Path=/`]))
      .mockResolvedValueOnce(backendResponse(200, { user: 'u1', roles: [], login_option: 'staff', cookie_prefix: '' }));
    const request = cookieRequest(URL_, { 'X-Access-Token': iamToken('kc-user-1', -60), 'X-Session-Id': 'sid' });

    const adopted = await adoptIamSession(request, 'ip');

    // No role here: still recorded, so the lookup is not repeated.
    expect(adopted).toMatchObject({ accessToken: fresh, option: { roles: [] } });
    expect(adopted!.setCookies).toEqual([`X-Access-Token=${fresh}; Path=/`]);
  });

  it('is not needed once the option was looked up for the same account', () => {
    expect(needsIamAdoption(cookieRequest(URL_, iamSessionCookies()))).toBe(false);
    expect(needsIamAdoption(cookieRequest(URL_, iamSessionCookies(STAFF_OPTION, iamToken('new-account'))))).toBe(true);
    expect(needsIamAdoption(cookieRequest(URL_, { auth_token: 'x' }))).toBe(false);
  });
});

describe('revokeIamSession', () => {
  it('logs out through the backend and passes on its answer', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { logged_out: true, provider_logout: false, logout_url: 'https://kc.example.org/logout' }, [
        'X-Access-Token=; Max-Age=0; Domain=.example.org; Path=/',
      ])
    );
    const request = cookieRequest(URL_, iamSessionCookies());
    const result = await revokeIamSession(readIamSession(request)!, request, 'ip');
    expect(result).toEqual({
      setCookies: ['X-Access-Token=; Max-Age=0; Domain=.example.org; Path=/'],
      providerLoggedOut: false,
      logoutUrl: 'https://kc.example.org/logout',
    });
    expect(sentTo().url).toBe('http://auth.internal/api/v1/auth/logout');
  });

  it('is best effort when the backend is down', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const request = cookieRequest(URL_, iamSessionCookies());
    expect(await revokeIamSession(readIamSession(request)!, request, 'ip')).toEqual({
      setCookies: [],
      providerLoggedOut: false,
      logoutUrl: null,
    });
  });
});

describe('applyIamCookies', () => {
  it("re-emits IAM's cookies with their own domain and flags", () => {
    const response = NextResponse.json({});
    applyIamCookies(response, ['X-Access-Token=abc; Domain=.example.org; Path=/; HttpOnly; Secure; SameSite=Lax']);
    const header = response.headers.getSetCookie().join('\n');
    expect(header).toContain('X-Access-Token=abc');
    expect(header).toContain('Domain=.example.org');
    expect(header).toMatch(/SameSite=lax/i);
  });
});

describe('fetchLoginProviders', () => {
  it('lists the options in order and caches them', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, {
        providers: [
          { key: 'local', label: 'Email', icon_url: '' },
          { key: 'staff', label: 'Staff', icon_url: 'data:image/png;base64,AA' },
        ],
      })
    );
    const providers = await fetchLoginProviders('ip');
    expect(providers).toEqual([
      { key: 'local', label: 'Email', iconUrl: null },
      { key: 'staff', label: 'Staff', iconUrl: 'data:image/png;base64,AA' },
    ]);
    expect(await fetchLoginProviders('ip')).toEqual(providers);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('is null when the backend is down', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await fetchLoginProviders('ip')).toBeNull();
  });
});

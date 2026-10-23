import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { isSessionIdleExpired, readActiveSession, renewSession } from './activeSession';
import { backendResponse, cookieRequest, iamSessionCookies, iamToken, STAFF_OPTION } from './iamTestFixtures';
import { decodeLoginOption } from './loginOption';
import { clearIdleSessionCookies, setSessionCookies } from './session';

const URL_ = 'http://localhost:3000/x';

describe('activeSession with IAM single sign-on', () => {
  it('reads an IAM session through its login option, with roles from /me', () => {
    const session = readActiveSession(cookieRequest(URL_, iamSessionCookies()));
    expect(session?.kind).toBe('iam');
    expect(session?.claims).toMatchObject({ sub: 'officer@moa.gov.et', roles: ['Grievance Officer'] });
  });

  it('treats an IAM user with no role on this app as a guest here', () => {
    expect(readActiveSession(cookieRequest(URL_, iamSessionCookies({ ...STAFF_OPTION, roles: [] })))).toBeNull();
  });

  it('prefers a local session when the browser holds both', () => {
    expect(readActiveSession(cookieRequest(URL_, { ...iamSessionCookies(), refresh_token: 'r' }))?.kind).toBe('local');
  });

  it("never idles out an IAM session on this app's own clock", () => {
    const req = cookieRequest(URL_, iamSessionCookies());
    expect(isSessionIdleExpired(readActiveSession(req), req)).toBe(false);
  });

  it('still idles out a local session with no recent activity', () => {
    const idle = cookieRequest(URL_, { refresh_token: 'r' });
    const active = cookieRequest(URL_, { refresh_token: 'r', last_activity: '1' });
    expect(isSessionIdleExpired(readActiveSession(idle), idle)).toBe(true);
    expect(isSessionIdleExpired(readActiveSession(active), active)).toBe(false);
  });

  it('clearIdleSessionCookies ends the local session and idle clock but leaves IAM cookies and the option alone', () => {
    const response = NextResponse.json({});
    clearIdleSessionCookies(response);
    const cookies = response.headers.getSetCookie().join('\n');

    expect(cookies).toMatch(/auth_token=;.*Max-Age=0/);
    expect(cookies).toMatch(/last_activity=;.*Max-Age=0/);
    expect(cookies).not.toContain('X-Access-Token');
    expect(cookies).not.toContain('login_option');
  });

  it('a local sign-in clears the login option', () => {
    const response = NextResponse.json({});
    setSessionCookies(response, { token: 't', refreshToken: 'r', rememberMe: false });
    expect(response.headers.getSetCookie().join('\n')).toMatch(/login_option=;.*Max-Age=0/);
  });
});

describe('renewSession for an IAM session', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://auth.internal/api';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AUTH_API_BASE_URL;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('relays the new cookies and records the refreshed roles', async () => {
    const fresh = iamToken('kc-user-1', 600);
    fetchMock
      .mockResolvedValueOnce(backendResponse(200, { refreshed: true }, [`X-Access-Token=${fresh}; Path=/`]))
      .mockResolvedValueOnce(
        backendResponse(200, { user: 'u1', roles: ['Grievance Admin'], login_option: 'staff', cookie_prefix: '' })
      );
    const req = cookieRequest(URL_, iamSessionCookies(STAFF_OPTION, iamToken('kc-user-1', -60)));

    const result = await renewSession(req, readActiveSession(req)!, 'ip');

    expect(result.status).toBe('renewed');
    if (result.status !== 'renewed') return;
    expect(result.claims?.roles).toEqual(['Grievance Admin']);
    const response = NextResponse.json({});
    result.apply(response);
    expect(response.cookies.get('X-Access-Token')?.value).toBe(fresh);
    expect(decodeLoginOption(response.cookies.get('login_option')?.value)?.roles).toEqual(['Grievance Admin']);
  });

  it('ends the session when the roles here were withdrawn', async () => {
    fetchMock
      .mockResolvedValueOnce(backendResponse(200, { refreshed: true }, [`X-Access-Token=${iamToken()}; Path=/`]))
      .mockResolvedValueOnce(backendResponse(200, { user: 'u1', roles: [], login_option: 'staff', cookie_prefix: '' }));
    const req = cookieRequest(URL_, iamSessionCookies(STAFF_OPTION, iamToken('kc-user-1', -60)));
    expect((await renewSession(req, readActiveSession(req)!, 'ip')).status).toBe('ended');
  });

  it('reports IAM being down without ending the session', async () => {
    fetchMock.mockResolvedValueOnce(backendResponse(503, 'down'));
    const req = cookieRequest(URL_, iamSessionCookies(STAFF_OPTION, iamToken('kc-user-1', -60)));
    expect((await renewSession(req, readActiveSession(req)!, 'ip')).status).toBe('unavailable');
  });
});

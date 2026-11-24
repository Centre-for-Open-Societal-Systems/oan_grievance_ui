import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function localToken(expOffsetSeconds: number): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'HS256' })}.${enc({ sub: 'a@b.et', roles: ['Grievance Officer'], exp: Math.floor(Date.now() / 1000) + expOffsetSeconds })}.sig`;
}

let cookieJar: Record<string, string> = {};
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name in cookieJar ? { value: cookieJar[name] } : undefined) }),
}));

import { loadInitialUser } from './initialUser';

const ME = { user: 'a@b.et', login_email: 'a@b.et', first_name: 'Abebe', last_name: 'Kebede', roles: ['Grievance Officer'] };

function meResponse(status = 200, body: unknown = { status: 'success', data: ME }) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('loadInitialUser', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://backend.test';
    cookieJar = { auth_token: localToken(300), last_activity: '1' };
    fetchMock.mockReset().mockResolvedValue(meResponse());
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns the mapped user for a valid local session, calling /auth/me as Bearer', async () => {
    const user = await loadInitialUser();

    expect(user).toMatchObject({ email: 'a@b.et', full_name: 'Abebe Kebede', roles: ['Grievance Officer'] });
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(String(url)).toContain('/v1/auth/me');
    expect(init.headers.Authorization).toBe(`Bearer ${cookieJar.auth_token}`);
  });

  it('does nothing without a session', async () => {
    cookieJar = {};
    expect(await loadInitialUser()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves an expired access token to the client restore, which can renew it', async () => {
    cookieJar = { auth_token: localToken(-60), refresh_token: 'r', last_activity: '1' };
    expect(await loadInitialUser()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not restore a session the user was idled out of', async () => {
    delete cookieJar.last_activity;
    expect(await loadInitialUser()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to null when the backend refuses, is down or sends something else', async () => {
    fetchMock.mockResolvedValueOnce(meResponse(401, { message: 'no' }));
    expect(await loadInitialUser()).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    expect(await loadInitialUser()).toBeNull();
    fetchMock.mockResolvedValueOnce(meResponse(200, { status: 'success', data: {} }));
    expect(await loadInitialUser()).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 300;
const LOCAL_TOKEN = `${encode({ alg: 'HS256' })}.${encode({ sub: 'abebe@example.com', exp, roles: ['Grievance Submitter'] })}.sig`;
// A staff token holding a role on this app's client — see `hasAppAccess`.
const STAFF_TOKEN = `${encode({ alg: 'RS256' })}.${encode({
  sub: 'kc-user-1',
  exp,
  resource_access: { 'oan-grievance': { roles: ['Grievance Officer'] } },
})}.sig`;

function me(cookies: Record<string, string>) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return GET(new NextRequest('http://localhost:3002/api/auth/me', { headers: { cookie } }));
}

describe('GET /api/auth/me idleManaged', () => {
  beforeEach(() => {
    process.env.IAM_BASE_URL = 'http://iam.internal:8020';
    process.env.IAM_LOGIN_PROVIDER_ID = '1';
    process.env.IAM_APPLICATION = 'oan-grievance';
  });

  afterEach(() => {
    delete process.env.IAM_BASE_URL;
    delete process.env.IAM_LOGIN_PROVIDER_ID;
    delete process.env.IAM_APPLICATION;
  });

  it('is true for a local session, which this app idles out', async () => {
    const res = await me({ auth_token: LOCAL_TOKEN, refresh_token: 'r', last_activity: '1' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ email: 'abebe@example.com', idleManaged: true });
  });

  it('is false for a staff (IAM) session, whose idle timeout is Keycloak’s', async () => {
    const res = await me({ 'X-Access-Token': STAFF_TOKEN, 'X-Session-Id': 'sid' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ idleManaged: false });
  });
});

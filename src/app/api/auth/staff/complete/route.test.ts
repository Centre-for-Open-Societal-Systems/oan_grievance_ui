import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function iamToken(roles: string[]): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256' })}.${encode({
    sub: 'kc-user-1',
    exp: Math.floor(Date.now() / 1000) + 300,
    resource_access: { 'oan-grievance': { roles } },
  })}.sig`;
}

function get(query: string, cookies: Record<string, string>) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return GET(new NextRequest(`http://localhost:3000/api/auth/staff/complete${query}`, { headers: { cookie } }));
}

describe('GET /api/auth/staff/complete', () => {
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

  it("starts the idle clock, drops any local session and lands on the role's home", async () => {
    const res = await get('', { 'X-Access-Token': iamToken(['Grievance Officer']), 'X-Session-Id': 'sid' });
    const cookies = res.headers.getSetCookie().join('\n');

    expect(res.status).toBe(200);
    expect(cookies).toMatch(/last_activity=1/);
    expect(cookies).toMatch(/auth_token=;.*Max-Age=0/);
    // IAM's own cookies are left exactly as IAM set them.
    expect(cookies).not.toContain('X-Access-Token');
    expect(await res.text()).toContain('url=/all-grievances');
  });

  it('keeps a same-origin return path', async () => {
    const res = await get('?returnUrl=%2Fgrievances%2FG-1', { 'X-Access-Token': iamToken([]) });
    expect(await res.text()).toContain('url=/grievances/G-1');
  });

  it('ignores an off-site return URL', async () => {
    const res = await get('?returnUrl=https%3A%2F%2Fevil.example', { 'X-Access-Token': iamToken(['Grievance Officer']) });
    const body = await res.text();
    expect(body).not.toContain('evil.example');
    expect(body).toContain('url=/all-grievances');
  });

  it('goes back to the login page without an IAM session', async () => {
    const res = await get('', {});
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?reason=staff_failed');
  });
});

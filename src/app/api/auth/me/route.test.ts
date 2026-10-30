import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { iamSessionCookies } from '@/lib/iamTestFixtures';
import { GET } from './route';

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 300;
const LOCAL_TOKEN = `${encode({ alg: 'HS256' })}.${encode({ sub: 'abebe@example.com', exp, roles: ['Grievance Submitter'] })}.sig`;
function me(cookies: Record<string, string>) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return GET(new NextRequest('http://localhost:3002/api/auth/me', { headers: { cookie } }));
}

describe('GET /api/auth/me idleManaged', () => {
  it('is true for a local session, which this app idles out', async () => {
    const res = await me({ auth_token: LOCAL_TOKEN, refresh_token: 'r', last_activity: '1' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ email: 'abebe@example.com', idleManaged: true });
  });

  it('is false for an IAM session, whose idle timeout is the identity provider’s', async () => {
    const res = await me(iamSessionCookies());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ idleManaged: false });
  });
});

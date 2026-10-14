import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const forwardIamCallback = vi.fn();
vi.mock('@/lib/iamSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/iamSession')>()),
  forwardIamCallback: (...args: unknown[]) => forwardIamCallback(...args),
}));

import { GET } from './route';

function get() {
  return GET(new NextRequest('http://localhost:3000/api/auth/staff/callback?code=c&state=s'));
}

describe('GET /api/auth/staff/callback', () => {
  beforeEach(() => {
    process.env.IAM_BASE_URL = 'http://iam.internal:8020';
    process.env.IAM_LOGIN_PROVIDER_ID = '1';
    process.env.IAM_APPLICATION = 'oan-grievance';
  });

  afterEach(() => {
    delete process.env.IAM_BASE_URL;
    delete process.env.IAM_LOGIN_PROVIDER_ID;
    delete process.env.IAM_APPLICATION;
    forwardIamCallback.mockReset();
  });

  it("relays IAM's cookies and sends the browser on to the landing route", async () => {
    forwardIamCallback.mockResolvedValue({
      accessToken: 't.t.t',
      location: 'http://localhost:3000/api/auth/staff/complete?returnUrl=%2Fgrievances',
      setCookies: ['X-Access-Token=t.t.t; Path=/; HttpOnly', 'X-Session-Id=sid; Path=/; HttpOnly'],
    });

    const res = await get();

    expect(forwardIamCallback).toHaveBeenCalledWith('?code=c&state=s', expect.any(String));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/api/auth/staff/complete?returnUrl=%2Fgrievances');
    expect(res.headers.getSetCookie().join('\n')).toContain('X-Session-Id=sid');
  });

  it('refuses to follow IAM anywhere but the landing route', async () => {
    forwardIamCallback.mockResolvedValue({ accessToken: 't.t.t', location: 'https://evil.example/', setCookies: [] });
    expect((await get()).headers.get('location')).toBe('http://localhost:3000/login?reason=staff_failed');
  });

  it('goes back to the login page when IAM did not open a session', async () => {
    forwardIamCallback.mockResolvedValue(null);
    expect((await get()).headers.get('location')).toBe('http://localhost:3000/login?reason=staff_failed');
  });
});

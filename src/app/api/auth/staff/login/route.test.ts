import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const startIamLogin = vi.fn();
vi.mock('@/lib/iamSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/iamSession')>()),
  startIamLogin: (...args: unknown[]) => startIamLogin(...args),
}));

import { GET } from './route';

let ip = 0;
function get(query = '') {
  ip += 1;
  return GET(
    new NextRequest(`http://localhost:3000/api/auth/staff/login${query}`, {
      headers: { 'x-forwarded-for': `10.0.0.${ip}` },
    })
  );
}

describe('GET /api/auth/staff/login', () => {
  beforeEach(() => {
    process.env.IAM_BASE_URL = 'http://iam.internal:8020';
    process.env.IAM_LOGIN_PROVIDER_ID = '1';
    process.env.IAM_APPLICATION = 'oan-grievance';
  });

  afterEach(() => {
    delete process.env.IAM_BASE_URL;
    delete process.env.IAM_LOGIN_PROVIDER_ID;
    delete process.env.IAM_APPLICATION;
    startIamLogin.mockReset();
  });

  it('sends the browser to the identity provider, never to IAM', async () => {
    startIamLogin.mockResolvedValue('https://kc.example.org/realms/staff/auth?state=s');

    const res = await get('?returnUrl=%2Fall-grievances');

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://kc.example.org/realms/staff/auth?state=s');
    // Absolute, and back at this app: IAM resolves a bare path against its own host.
    expect(startIamLogin).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/staff/complete?returnUrl=%2Fall-grievances',
      expect.any(String)
    );
  });

  it('never hands IAM an off-site return URL', async () => {
    startIamLogin.mockResolvedValue('https://kc.example.org/auth');
    await get('?returnUrl=https%3A%2F%2Fevil.example');
    await get('?returnUrl=%2F%2Fevil.example');
    expect(startIamLogin.mock.calls.map((c) => c[0])).toEqual([
      'http://localhost:3000/api/auth/staff/complete',
      'http://localhost:3000/api/auth/staff/complete',
    ]);
  });

  it('goes back to the login page when IAM is unavailable', async () => {
    startIamLogin.mockResolvedValue(null);
    const res = await get();
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?reason=staff_unavailable');
  });

  it('goes back to the login page when staff sign-in is not configured', async () => {
    delete process.env.IAM_BASE_URL;
    const res = await get();
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?reason=staff_unavailable');
    expect(startIamLogin).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextResponse } from 'next/server';
import { isSessionIdleExpired, readActiveSession } from './activeSession';
import { clearIdleSessionCookies } from './session';

function iamToken(roles: string[]): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256' })}.${encode({
    sub: 'kc-user-1',
    exp: Math.floor(Date.now() / 1000) + 300,
    resource_access: { 'oan-grievance': { roles } },
  })}.sig`;
}

function request(cookies: Record<string, string>) {
  return { cookies: { get: (name: string) => (name in cookies ? { value: cookies[name]! } : undefined) } };
}

describe('activeSession with staff (IAM) single sign-on', () => {
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

  it('adopts an IAM session opened at another app when the user holds a role on this one', () => {
    const session = readActiveSession(request({ 'X-Access-Token': iamToken(['Grievance Officer']), 'X-Session-Id': 's' }));
    expect(session?.kind).toBe('iam');
  });

  it('treats an IAM user with no role on this app as a guest here', () => {
    expect(readActiveSession(request({ 'X-Access-Token': iamToken([]), 'X-Session-Id': 's' }))).toBeNull();
  });

  it("never idles out an IAM session on this app's own clock", () => {
    const req = request({ 'X-Access-Token': iamToken(['Grievance Officer']), 'X-Session-Id': 's' });
    expect(isSessionIdleExpired(readActiveSession(req), req)).toBe(false);
  });

  it('still idles out a local session with no recent activity', () => {
    const idle = request({ refresh_token: 'r' });
    const active = request({ refresh_token: 'r', last_activity: '1' });
    expect(isSessionIdleExpired(readActiveSession(idle), idle)).toBe(true);
    expect(isSessionIdleExpired(readActiveSession(active), active)).toBe(false);
  });

  it('clearIdleSessionCookies ends the local session and idle clock but leaves IAM cookies alone', () => {
    const response = NextResponse.json({});
    clearIdleSessionCookies(response);
    const cookies = response.headers.getSetCookie().join('\n');

    expect(cookies).toMatch(/auth_token=;.*Max-Age=0/);
    expect(cookies).toMatch(/last_activity=;.*Max-Age=0/);
    expect(cookies).not.toContain('X-Access-Token');
    expect(cookies).not.toContain('X-Session-Id');
  });
});

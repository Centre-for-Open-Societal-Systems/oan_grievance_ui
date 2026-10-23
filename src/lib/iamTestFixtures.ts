// Test-only helpers for IAM sessions: tokens, the `login_option` cookie and
// requests carrying them. Imported by `*.test.ts` files only.
import { encodeLoginOption, type LoginOption } from '@/lib/loginOption';
import { NextRequest } from 'next/server';

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** An unsigned IAM-shaped access token; only `sub` and `exp` are ever read. */
export function iamToken(sub = 'kc-user-1', expOffsetSeconds = 300): string {
  return `${encode({ alg: 'RS256' })}.${encode({ sub, exp: Math.floor(Date.now() / 1000) + expOffsetSeconds })}.sig`;
}

export const STAFF_OPTION: LoginOption = {
  key: 'staff',
  cookie_prefix: '',
  sub: 'kc-user-1',
  user: 'officer@moa.gov.et',
  roles: ['Grievance Officer'],
};

/** The cookies of a signed-in IAM session: `login_option` plus IAM's own, under the option's prefix. */
export function iamSessionCookies(
  option: LoginOption = STAFF_OPTION,
  token: string = iamToken(option.sub)
): Record<string, string> {
  return {
    login_option: encodeLoginOption(option),
    [`${option.cookie_prefix}X-Access-Token`]: token,
    [`${option.cookie_prefix}X-Session-Id`]: 'sid',
  };
}

export function cookieRequest(url: string, cookies: Record<string, string>, init: RequestInit = {}): NextRequest {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const headers = new Headers(init.headers);
  headers.set('cookie', cookie);
  return new NextRequest(url, { ...init, headers } as ConstructorParameters<typeof NextRequest>[1]);
}

/** A backend REST envelope response, with optional `Set-Cookie` headers. */
export function backendResponse(status: number, data: unknown, setCookies: string[] = []): Response {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const c of setCookies) headers.append('set-cookie', c);
  const body = status < 400 ? { status: 'success', data } : { status: 'error', message: String(data) };
  return new Response(JSON.stringify(body), { status, headers });
}

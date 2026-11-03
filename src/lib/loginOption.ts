import { z } from 'zod';

// Which oan_auth_service login option the browser's IAM session came through,
// kept in this app's own `login_option` cookie. IAM sets its tokens in cookies
// on the shared parent domain under a per-option prefix (empty for staff,
// `agent-` for agents, …), and a browser signed in to two options holds both
// sets — so every route that sends an IAM token needs the prefix to know which
// cookie to read. oan_auth_service hands the prefix out (`POST
// /api/v1/auth/iam/login`, `GET /api/v1/auth/me`); nothing about IAM is
// configured here.
//
// Also caches the user's roles in this app, as `/auth/me` answered them, for
// `proxy.ts`: it routes pages without a backend call per navigation. Like a
// decoded local access token, the cookie is read for routing and display only
// — the backend checks the token itself on every API call. `sub` is the
// token's subject when the roles were looked up: a different IAM account
// signed in since (at another OpenG2P app) makes the entry stale.
//
// Kept free of Next.js imports: the realtime gateway reads it too.

export const LOGIN_OPTION_COOKIE = 'login_option';

/** Base names of IAM's session cookies; each is read as `<cookie_prefix><base>`. */
export const IAM_COOKIES = {
  accessToken: 'X-Access-Token',
  idToken: 'X-ID-Token',
  sessionId: 'X-Session-Id',
} as const;

const loginOptionSchema = z.object({
  key: z.string().min(1),
  cookie_prefix: z.string(),
  /** Unset until the user has been looked up (between the login start and the landing route). */
  sub: z.string().optional(),
  user: z.string().optional(),
  roles: z.array(z.string()).optional(),
});

export type LoginOption = z.infer<typeof loginOptionSchema>;

export function iamCookieName(base: string, option: Pick<LoginOption, 'cookie_prefix'>): string {
  return `${option.cookie_prefix}${base}`;
}

/** The cookie value: base64url JSON, so it needs no quoting in any cookie parser. */
export function encodeLoginOption(option: LoginOption): string {
  return Buffer.from(JSON.stringify(option)).toString('base64url');
}

/** The parsed cookie value, or null when it is absent or not one this app wrote. */
export function decodeLoginOption(value: string | undefined): LoginOption | null {
  if (!value) return null;
  try {
    const parsed = loginOptionSchema.safeParse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

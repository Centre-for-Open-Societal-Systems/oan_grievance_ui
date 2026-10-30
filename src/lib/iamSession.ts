import { isExpired, peekToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import {
  decodeLoginOption,
  IAM_COOKIES,
  iamCookieName,
  LOGIN_OPTION_COOKIE,
  type LoginOption,
} from '@/lib/loginOption';
import { BackendAuthError, requestBackendAuth } from '@/lib/oanAuthBackend';
import type { NextResponse } from 'next/server';
import { z } from 'zod';

// IAM login options ("Sign in as staff", agent, beneficiary, …): sessions that
// belong to an OpenG2P IAM service, reached only through oan_auth_service. IAM
// runs the identity provider login and sets its own cookies on the shared
// parent domain — the access token, the ID token and the session id that
// points at the refresh token IAM keeps. This app never copies them into its
// own `auth_token`/`refresh_token`.
//
// This app knows no IAM URL, provider id, application or cookie prefix:
// oan_auth_service lists the options (`/iam/providers`), starts their logins
// (`/iam/login`), answers which option a token came through and the user's
// roles (`/me`), and refreshes and ends their sessions (`/refresh`,
// `/logout` with `access_token`), relaying IAM's `Set-Cookie` headers. The
// option a browser is using is kept in the `login_option` cookie
// (`loginOption.ts`). Tokens go to the backend as `Authorization: Bearer`;
// browser cookies are forwarded only to refresh and logout, and only the
// active option's.

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

interface CookieLister extends CookieReader {
  cookies: CookieReader['cookies'] & { getAll(): { name: string; value: string }[] };
}

export function readLoginOption(request: CookieReader): LoginOption | null {
  return decodeLoginOption(request.cookies.get(LOGIN_OPTION_COOKIE)?.value);
}

export interface IamSession {
  option: LoginOption;
  accessToken: string | undefined;
  sessionId: string | undefined;
  idToken: string | undefined;
  /** Decoded, not verified — the subject and expiry only. The backend verifies. */
  token: { sub: string; exp: number } | null;
}

/** The session of the browser's login option, or null when it has none (or no option is recorded). */
export function readIamSession(request: CookieReader): IamSession | null {
  const option = readLoginOption(request);
  if (!option) return null;

  const read = (base: string) => request.cookies.get(iamCookieName(base, option))?.value || undefined;
  const accessToken = read(IAM_COOKIES.accessToken);
  const sessionId = read(IAM_COOKIES.sessionId);
  if (!accessToken && !sessionId) return null;

  return {
    option,
    accessToken,
    sessionId,
    idToken: read(IAM_COOKIES.idToken),
    token: accessToken ? peekToken(accessToken) : null,
  };
}

/**
 * Whether the browser dropped the access-token cookie for being too large
 * (over about 4 KB, from many roles or large custom claims) while keeping the
 * ID token IAM set alongside it — a plain failure would hide the cause.
 */
export function isAccessTokenDropped(request: CookieReader, option: LoginOption): boolean {
  return (
    !request.cookies.get(iamCookieName(IAM_COOKIES.accessToken, option))?.value &&
    !!request.cookies.get(iamCookieName(IAM_COOKIES.idToken, option))?.value
  );
}

/**
 * Whether the IAM session is one for this app. A single sign-on session
 * reaches every app on the shared domain, including users provisioned only
 * for another one (a registry-only operator); only a user `/auth/me` gave a
 * role here counts as signed in, for the account the roles were looked up for.
 * Anyone else is a guest to this app, while their session stays untouched for
 * the apps it is for.
 */
export function hasAppAccess(session: IamSession): boolean {
  return !!session.option.roles?.length && !!session.token && session.token.sub === session.option.sub;
}

/** IAM refreshes from its session cookie, and oan_auth_service routes the call by the (expired) access token. */
export function canRefreshIamSession(session: IamSession): boolean {
  return !!session.accessToken && !!session.sessionId;
}

/** The option's IAM cookies as a `Cookie` header: what refresh and logout forward, and nothing else. */
function iamCookieHeader(option: LoginOption, request: CookieReader): string {
  return Object.values(IAM_COOKIES)
    .map((base) => iamCookieName(base, option))
    .flatMap((name) => {
      const value = request.cookies.get(name)?.value;
      return value ? [`${name}=${value}`] : [];
    })
    .join('; ');
}

// --- Relaying IAM's Set-Cookie headers -------------------------------------

type CookieOptions = NonNullable<Parameters<NextResponse['cookies']['set']>[2]>;

interface ParsedCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * Parses one `Set-Cookie` header so it can go through `response.cookies.set`.
 * Appending the raw header would be simpler, but `NextResponse.cookies`
 * rewrites every `set-cookie` header from its own map on each later `.set()`,
 * silently dropping anything appended behind its back.
 */
function parseSetCookie(header: string): ParsedCookie | null {
  const [pair, ...attributes] = header.split(';');
  const eq = pair?.indexOf('=') ?? -1;
  if (!pair || eq <= 0) return null;

  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
  const options: CookieOptions = {};

  for (const attribute of attributes) {
    const [rawKey, ...rest] = attribute.split('=');
    const key = rawKey?.trim().toLowerCase();
    const attrValue = rest.join('=').trim();
    if (key === 'max-age') options.maxAge = Number(attrValue);
    else if (key === 'expires') options.expires = new Date(attrValue);
    else if (key === 'domain') options.domain = attrValue;
    else if (key === 'path') options.path = attrValue;
    else if (key === 'secure') options.secure = true;
    else if (key === 'httponly') options.httpOnly = true;
    else if (key === 'samesite') {
      const sameSite = attrValue.toLowerCase();
      if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') options.sameSite = sameSite;
    }
  }

  return { name, value, options };
}

/**
 * Re-emits IAM's cookies on `response` exactly as IAM set them (same domain,
 * path and flags), so the browser stores the cookies IAM itself would have.
 * Call after any cookie clearing on the same response: cookies are keyed by
 * name, so the later write wins.
 */
export function applyIamCookies(response: NextResponse, setCookies: string[]): void {
  for (const header of setCookies) {
    const parsed = parseSetCookie(header);
    if (parsed) response.cookies.set(parsed.name, parsed.value, parsed.options);
  }
}

/**
 * Expires every IAM session cookie the browser sent, whatever its option prefix. For a logout
 * where IAM sent no clearing headers of its own (it could not be reached, or no longer knew the
 * session): left in place, `adoptIamSession` would take the same session up again on the next
 * page load. Host-only, like the cookies `applyIamCookies` could not clear either — a cookie IAM
 * set on a parent domain is cleared only by IAM's own `Set-Cookie`.
 */
export function expireIamCookies(response: NextResponse, request: CookieLister): void {
  const bases = Object.values(IAM_COOKIES);
  for (const { name } of request.cookies.getAll()) {
    if (bases.some((base) => name.endsWith(base))) {
      response.cookies.set(name, '', { path: '/', maxAge: 0 });
    }
  }
}

/** The value a cookie is given in `setCookies`, ignoring clear-before-set (`Max-Age=0`) writes. */
function cookieValueFrom(setCookies: string[], name: string): string | undefined {
  let found: string | undefined;
  for (const header of setCookies) {
    const parsed = parseSetCookie(header);
    if (parsed?.name === name && parsed.value && parsed.options.maxAge !== 0) found = parsed.value;
  }
  return found;
}

// --- Calls to oan_auth_service ---------------------------------------------

function isUnavailable(error: unknown): boolean {
  // A network failure, or the backend saying IAM is unreachable: the session
  // may well be fine, so nobody is signed out over it.
  return !(error instanceof BackendAuthError) || error.status >= 500;
}

const loginStartSchema = z.object({ redirect_url: z.string(), iam: z.string().min(1), cookie_prefix: z.string() });

export type IamLoginStart =
  | { ok: true; redirectUrl: string; option: LoginOption }
  | { ok: false; reason: 'not_offered' | 'failed' | 'unavailable' };

function isAllowedRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch {
    return false;
  }
}

/**
 * Starts login option `key` and returns the identity provider URL to send the
 * browser to. `returnUrl` must be absolute and on one of the option's
 * `return_origins` in oan_auth_service — the only open-redirect guard, since
 * IAM redirects to it unchecked.
 */
export async function startIamLogin(key: string, returnUrl: string, clientIp: string): Promise<IamLoginStart> {
  try {
    const { data } = await requestBackendAuth<unknown>(
      '/api/v1/auth/iam/login',
      { body: { key, return_url: returnUrl } },
      clientIp
    );
    const parsed = loginStartSchema.safeParse(data);
    if (!parsed.success || !isAllowedRedirect(parsed.data.redirect_url)) {
      logger.security(`IAM login start for "${key}" answered an unusable redirect`);
      return { ok: false, reason: 'failed' };
    }
    return {
      ok: true,
      redirectUrl: parsed.data.redirect_url,
      option: { key: parsed.data.iam, cookie_prefix: parsed.data.cookie_prefix },
    };
  } catch (error) {
    if (error instanceof BackendAuthError && error.status === 400) {
      // Unknown or disabled key, or this app's origin missing from the
      // option's `return_origins`: a configuration error, not the user's.
      logger.security(`IAM login option "${key}" refused: ${error.message}`);
      return { ok: false, reason: 'not_offered' };
    }
    if (error instanceof BackendAuthError && error.status === 502) return { ok: false, reason: 'failed' };
    logger.error(`IAM login start for "${key}" failed:`, error);
    return { ok: false, reason: 'unavailable' };
  }
}

const meSchema = z.object({
  user: z.string().min(1),
  login_email: z.string().nullish(),
  roles: z.array(z.string()),
  login_option: z.string().min(1),
  cookie_prefix: z.string().nullish(),
});

export type IamUserLookup =
  | { status: 'ok'; option: LoginOption }
  | { status: 'unauthorized' }
  | { status: 'unavailable' };

/**
 * Asks oan_auth_service who `accessToken` belongs to. This runs the full token
 * check, creates the user on first sign-in, and answers the login option the
 * token came through plus the user's roles in this app — never decoded from
 * the token, which may carry none (eSignet) and never shows the backend's
 * default roles. A token of this app's own (`local`) is not an IAM session.
 */
export async function lookupIamUser(accessToken: string, clientIp: string): Promise<IamUserLookup> {
  const token = peekToken(accessToken);
  try {
    const { data } = await requestBackendAuth<unknown>(
      '/api/v1/auth/me',
      { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } },
      clientIp
    );
    const parsed = meSchema.safeParse(data);
    if (!parsed.success || !token || parsed.data.login_option === 'local' || parsed.data.cookie_prefix == null) {
      return { status: 'unauthorized' };
    }
    return {
      status: 'ok',
      option: {
        key: parsed.data.login_option,
        cookie_prefix: parsed.data.cookie_prefix,
        sub: token.sub,
        user: parsed.data.login_email || parsed.data.user,
        roles: parsed.data.roles,
      },
    };
  } catch (error) {
    if (isUnavailable(error)) {
      logger.error('IAM user lookup failed:', error);
      return { status: 'unavailable' };
    }
    return { status: 'unauthorized' };
  }
}

export type IamRefresh =
  | { status: 'ok'; accessToken: string; refreshed: boolean; setCookies: string[] }
  | { status: 'ended'; setCookies: string[] }
  | { status: 'unavailable' };

/**
 * Has the option's IAM refresh the session, through oan_auth_service: the
 * current (possibly expired) access token goes in the body, where its issuer
 * picks the IAM, and the option's IAM cookies are forwarded, since IAM
 * refreshes from its session cookie. IAM's new cookies come back for the
 * caller to relay. A token that was still valid comes back unchanged
 * (`refreshed: false`).
 */
async function refreshIamToken(
  option: LoginOption,
  accessToken: string,
  request: CookieReader,
  clientIp: string
): Promise<IamRefresh> {
  try {
    const { data, setCookies } = await requestBackendAuth<{ refreshed?: unknown }>(
      '/api/v1/auth/refresh',
      { body: { access_token: accessToken }, headers: { Cookie: iamCookieHeader(option, request) } },
      clientIp
    );
    const renewed = cookieValueFrom(setCookies, iamCookieName(IAM_COOKIES.accessToken, option));
    return { status: 'ok', accessToken: renewed ?? accessToken, refreshed: !!renewed && data?.refreshed !== false, setCookies };
  } catch (error) {
    if (isUnavailable(error)) {
      logger.error('IAM refresh failed:', error);
      return { status: 'unavailable' };
    }
    logger.security(`IAM refused to refresh a session (status ${(error as BackendAuthError).status})`);
    return { status: 'ended', setCookies: (error as BackendAuthError).setCookies };
  }
}

export type RenewedIamSession =
  | { status: 'ok'; accessToken: string; refreshed: boolean; option: LoginOption; setCookies: string[] }
  | { status: 'ended'; setCookies: string[] }
  | { status: 'unavailable' };

/**
 * Renews the session's access token. After a real refresh the user is looked
 * up again, so roles stay as fresh as a local session's (re-read on every
 * token rotation); if that lookup is unavailable the roles already known are
 * kept.
 */
export async function renewIamSession(
  session: IamSession,
  request: CookieReader,
  clientIp: string
): Promise<RenewedIamSession> {
  if (!canRefreshIamSession(session)) return { status: 'ended', setCookies: [] };

  const result = await refreshIamToken(session.option, session.accessToken!, request, clientIp);
  if (result.status !== 'ok') return result;
  if (!result.refreshed) return { ...result, option: session.option };

  const lookup = await lookupIamUser(result.accessToken, clientIp);
  if (lookup.status === 'unauthorized') return { status: 'ended', setCookies: result.setCookies };
  const option = lookup.status === 'ok' ? lookup.option : { ...session.option, sub: peekToken(result.accessToken)?.sub };
  return { ...result, option };
}

/**
 * Picks up an IAM session this app did not start: the user signed in through
 * another OpenG2P app and arrives with IAM cookies but no `login_option` for
 * them. Each IAM access cookie found (at most three) is looked up by itself as
 * a Bearer token — refreshed first when expired — so the backend never has to
 * guess between two options' cookies.
 *
 * Returns the option to record — with no roles when the user has none here, so
 * the lookup is not repeated on every page load — plus the token it looked up
 * and any IAM cookies a refresh set. Null when there is nothing to adopt or the backend could not
 * answer.
 */
export interface AdoptedIamSession {
  option: LoginOption;
  accessToken: string;
  setCookies: string[];
}

export async function adoptIamSession(request: CookieLister, clientIp: string): Promise<AdoptedIamSession | null> {
  const candidates = request.cookies
    .getAll()
    .filter(({ name, value }) => value && name.endsWith(IAM_COOKIES.accessToken))
    .slice(0, 3);

  for (const { name, value } of candidates) {
    const prefix = name.slice(0, -IAM_COOKIES.accessToken.length);
    let accessToken = value;
    let setCookies: string[] = [];

    const token = peekToken(accessToken);
    if (!token) continue;
    if (isExpired(token)) {
      const refreshed = await refreshIamToken({ key: '', cookie_prefix: prefix }, accessToken, request, clientIp);
      if (refreshed.status !== 'ok') continue;
      accessToken = refreshed.accessToken;
      setCookies = refreshed.setCookies;
    }

    const lookup = await lookupIamUser(accessToken, clientIp);
    if (lookup.status === 'ok' && lookup.option.cookie_prefix === prefix) {
      return { option: lookup.option, accessToken, setCookies };
    }
  }
  return null;
}

/**
 * Whether the request carries an IAM access cookie that its `login_option`
 * does not account for: none recorded, one recorded before the user was looked
 * up (a login abandoned at the identity provider), or one looked up for an
 * account that has since been replaced by another sign-in.
 */
export function needsIamAdoption(request: CookieLister): boolean {
  const hasAccessCookie = request.cookies
    .getAll()
    .some(({ name, value }) => value && name.endsWith(IAM_COOKIES.accessToken));
  if (!hasAccessCookie) return false;

  const session = readIamSession(request);
  return !session?.token || !session.option.sub || session.token.sub !== session.option.sub;
}

export interface IamLogout {
  setCookies: string[];
  /** The identity provider session was ended server-to-server. */
  providerLoggedOut: boolean;
  /** Otherwise, the provider logout URL for the browser to visit so it ends too. */
  logoutUrl: string | null;
}

/**
 * Ends the session at IAM, through oan_auth_service, which also ends the
 * identity provider's session server-to-server when it can. Best effort: on
 * any failure the session is still ended here, just not upstream.
 */
export async function revokeIamSession(session: IamSession, request: CookieReader, clientIp: string): Promise<IamLogout> {
  const none: IamLogout = { setCookies: [], providerLoggedOut: false, logoutUrl: null };
  if (!session.accessToken) return none;

  try {
    const { data, setCookies } = await requestBackendAuth<{ provider_logout?: unknown; logout_url?: unknown }>(
      '/api/v1/auth/logout',
      { body: { access_token: session.accessToken }, headers: { Cookie: iamCookieHeader(session.option, request) } },
      clientIp
    );
    const logoutUrl = typeof data?.logout_url === 'string' && isAllowedRedirect(data.logout_url) ? data.logout_url : null;
    return { setCookies, providerLoggedOut: data?.provider_logout === true, logoutUrl };
  } catch (error) {
    logger.error('IAM logout failed:', error);
    return none;
  }
}

// --- The login page's options ----------------------------------------------

const providersSchema = z.object({
  providers: z.array(z.object({ key: z.string().min(1), label: z.string(), icon_url: z.string().nullish() })),
});

export interface LoginProvider {
  key: string;
  label: string;
  iconUrl: string | null;
}

const PROVIDERS_TTL_MS = 60_000;
let providersCache: { at: number; providers: LoginProvider[] } | null = null;

/**
 * The enabled login options, in display order, from oan_auth_service: `local`
 * is this app's own email/password form, any other key an IAM option started
 * through `/api/auth/iam/login`. Cached for a minute per process. Null when
 * the backend could not answer.
 */
export async function fetchLoginProviders(clientIp: string): Promise<LoginProvider[] | null> {
  if (providersCache && Date.now() - providersCache.at < PROVIDERS_TTL_MS) return providersCache.providers;
  try {
    const { data } = await requestBackendAuth<unknown>('/api/v1/auth/iam/providers', { method: 'GET' }, clientIp);
    const parsed = providersSchema.safeParse(data);
    if (!parsed.success) {
      logger.error('Login options answered in an unknown shape');
      return null;
    }
    const providers = parsed.data.providers.map((p) => ({ key: p.key, label: p.label, iconUrl: p.icon_url || null }));
    providersCache = { at: Date.now(), providers };
    return providers;
  } catch (error) {
    logger.error('Login options could not be loaded:', error);
    return null;
  }
}

/** Test hook: forgets the cached login options. */
export function resetLoginProvidersCache(): void {
  providersCache = null;
}

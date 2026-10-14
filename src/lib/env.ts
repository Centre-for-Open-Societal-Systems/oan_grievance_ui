// Server-only environment configuration. Validated on first access (not at
// module load) so a build can proceed without the value present; a request
// that reaches an auth route without it configured fails with a clear message
// instead of a bare fetch error against an empty URL.
export const env = {
  get AUTH_API_BASE_URL(): string {
    const val = process.env.AUTH_API_BASE_URL;
    if (!val) {
      throw new Error('[env] Missing required environment variable: AUTH_API_BASE_URL');
    }
    try {
      new URL(val);
    } catch {
      throw new Error(`[env] Invalid environment configuration: AUTH_API_BASE_URL must be a valid URL (got "${val}")`);
    }
    return val.replace(/\/+$/, '');
  },

  /**
   * The OpenG2P IAM service that "Sign in as staff" delegates to. Optional:
   * when `IAM_BASE_URL` is unset staff sign-in is off and only the local
   * password form is offered. Server-only — the browser never learns IAM's
   * address; every IAM call goes through `src/lib/iamSession.ts`.
   *
   * `application` must equal oan_auth_service's `iam_application`: it names
   * the client whose roles (`resource_access[application].roles`) the backend
   * syncs onto the local user, so routing here reads the same list.
   * `cookieDomain` must equal IAM's `*_AUTH_COOKIE_DOMAIN`, or the cookies
   * this app expires on an idle kick are different cookies from IAM's.
   */
  get IAM(): {
    baseUrl: string;
    loginProviderId: string;
    application: string;
    cookiePrefix: string;
    cookieDomain: string | undefined;
  } | null {
    const baseUrl = process.env.IAM_BASE_URL;
    if (!baseUrl) return null;
    try {
      new URL(baseUrl);
    } catch {
      throw new Error(`[env] Invalid environment configuration: IAM_BASE_URL must be a valid URL (got "${baseUrl}")`);
    }
    const loginProviderId = process.env.IAM_LOGIN_PROVIDER_ID;
    const application = process.env.IAM_APPLICATION;
    if (!loginProviderId || !application) {
      throw new Error('[env] IAM_BASE_URL is set, so IAM_LOGIN_PROVIDER_ID and IAM_APPLICATION are required');
    }
    return {
      baseUrl: baseUrl.replace(/\/+$/, ''),
      loginProviderId,
      application,
      cookiePrefix: process.env.IAM_COOKIE_PREFIX ?? '',
      cookieDomain: process.env.IAM_COOKIE_DOMAIN || undefined,
    };
  },

  /**
   * The grievance service's socket.io endpoint (AsyncAPI `servers`), e.g.
   * `wss://grievance.openagrinet.org` plus the Frappe site the socket's
   * namespace is named after. Optional: when either is unset realtime is off
   * and the UI falls back to reading state through REST only, so a deployment
   * without a socket gateway still runs. A value that is set but malformed
   * throws, same as AUTH_API_BASE_URL.
   */
  get REALTIME(): { url: string; site: string; path: string } | null {
    const url = process.env.REALTIME_PUBLIC_URL;
    const site = process.env.REALTIME_SITE;
    if (!url || !site) return null;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`[env] Invalid environment configuration: REALTIME_PUBLIC_URL must be a valid URL (got "${url}")`);
    }
    if (parsed.protocol !== 'wss:' && parsed.protocol !== 'ws:') {
      throw new Error(`[env] Invalid environment configuration: REALTIME_PUBLIC_URL must use ws:// or wss:// (got "${url}")`);
    }
    return {
      url: parsed.origin,
      site,
      path: process.env.REALTIME_PATH || '/socket.io/',
    };
  },
};

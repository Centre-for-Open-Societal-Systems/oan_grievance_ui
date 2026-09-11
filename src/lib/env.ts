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
};

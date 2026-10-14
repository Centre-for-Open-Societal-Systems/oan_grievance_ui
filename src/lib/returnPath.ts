// Any origin works as the parse base: all that matters is whether the value
// stays on it. `.invalid` is reserved, so it can never be a real host.
const PARSE_ORIGIN = 'http://return-path.invalid';

// Rejected outright, before parsing, as defense in depth. Browsers silently
// strip tab/CR/LF from a URL, so `/\t/evil.com` is `//evil.com` to them.
// The parser below strips them the same way, but no real path has one.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * `value` as a same-origin path (`/x?y#z`), or null if it would lead off-site.
 * For every redirect target that came from a query string or body — the
 * login form's `returnUrl`, the logout `returnTo`, and the post-login path
 * IAM hands back after staff sign-in, which IAM itself never validates.
 *
 * Decided by parsing it as a browser would, not by matching the string:
 * `//host`, `/\host`, `/\t/host` and the like all resolve to another origin,
 * however they are spelt. The parsed path is what gets returned, so the
 * redirect goes exactly where the check looked — after checking that
 * path again, since normalizing can turn a safe input into `//host`.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || CONTROL_CHARS.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, PARSE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PARSE_ORIGIN) return null;
  const path = url.pathname + url.search + url.hash;
  // The output gets the same test as the input: normalizing can itself make
  // an off-site URL — `/a/../..//evil.com` parses on-origin, yet its
  // pathname is `//evil.com`.
  return new URL(path, PARSE_ORIGIN).origin === PARSE_ORIGIN ? path : null;
}

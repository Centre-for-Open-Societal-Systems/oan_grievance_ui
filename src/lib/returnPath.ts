/**
 * `value` if it is a same-origin path (`/x`, not `//host` or `https://…`),
 * otherwise null. For every redirect target that came from a query string —
 * the login form's `returnUrl`, and the post-login path IAM hands back after
 * staff sign-in, which IAM itself never validates.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

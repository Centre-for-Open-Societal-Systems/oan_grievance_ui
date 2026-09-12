/** The only public routes. Everything else is a dashboard screen that needs a session. */
export const PUBLIC_ROUTES = ['/login', '/register'];

// Exact-or-segment match, not a bare prefix: `/login` must match `/login` and
// `/login/whatever`, but never a route that merely starts with the same
// characters, like a future `/login-history`.
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isProtectedRoute(pathname: string): boolean {
  return !isPublicRoute(pathname);
}

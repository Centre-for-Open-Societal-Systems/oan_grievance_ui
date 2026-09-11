/** The only public routes. Everything else is a dashboard screen that needs a session. */
const PUBLIC_ROUTES = ['/login', '/register'];

export function isProtectedRoute(pathname: string): boolean {
  return !PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

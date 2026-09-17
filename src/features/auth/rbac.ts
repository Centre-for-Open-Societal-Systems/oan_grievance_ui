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

/**
 * The three generic roles this app routes by. These strings are STILL A
 * GUESS, now confirmed unverifiable rather than just unverified: checked
 * directly against a live `oan_auth_service` + fresh self-registration
 * round-trip (2026-09-15), no Frappe Role record named anything like
 * "Grievance *" exists in that database yet, and self-registration currently
 * assigns no role at all (`jwt_default_registration_role` isn't set in that
 * site's config) — a real self-registered user's JWT `roles` claim is `[]`.
 * Update this file once the backend actually defines these roles.
 */
export const ROLES = {
  SUBMITTER: 'Grievance Submitter',
  OFFICER: 'Grievance Officer',
  ADMIN: 'Grievance Admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Routes open to any authenticated role, whatever it is — deliberately, not
 * by omission. `canAccessRoute` denies anything absent from both this list
 * and `ROUTE_ROLES`, so a route added later without an entry in either is
 * blocked (and visibly so, since it redirects) rather than silently open.
 * `/no-access` must stay here: it's `DEFAULT_HOME_ROUTE` below, the landing
 * page for a role that matches nothing in `ROUTE_ROLES` — if it required a
 * role itself, that user would bounce off it straight back to itself.
 */
const UNRESTRICTED_ROUTES = ['/no-access'];

function isUnrestrictedRoute(pathname: string): boolean {
  return UNRESTRICTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Which roles may open each dashboard route (checked against the JWT's
 * unverified `roles` claim, like the rest of this file). A route absent from
 * both this map and `UNRESTRICTED_ROUTES` is denied to everyone — see
 * `canAccessRoute`. This is a UX-layer guard only: the backend re-checks
 * every real API call regardless (see `oan_grievance_service`), so this
 * cannot be the only place access is enforced.
 */
const ROUTE_ROLES: Record<string, Role[]> = {
  '/dashboard': [ROLES.OFFICER, ROLES.ADMIN],
  '/submit-grievance': [ROLES.SUBMITTER],
  '/all-grievances': [ROLES.SUBMITTER, ROLES.OFFICER, ROLES.ADMIN],
  '/grievances': [ROLES.SUBMITTER, ROLES.OFFICER, ROLES.ADMIN],
  '/analytics-reporting': [ROLES.OFFICER, ROLES.ADMIN],
  '/user-management': [ROLES.ADMIN],
  '/administration': [ROLES.ADMIN],
  '/settings': [ROLES.OFFICER, ROLES.ADMIN],
};

/** Highest-privilege role first — decides which home route wins for a multi-role user. */
const ROLE_PRIORITY: Role[] = [ROLES.ADMIN, ROLES.OFFICER, ROLES.SUBMITTER];

/** Where each role lands right after login, and where it's sent back to if it's bounced off a route it can't access. */
const ROLE_HOME_ROUTE: Record<Role, string> = {
  [ROLES.ADMIN]: '/dashboard',
  [ROLES.OFFICER]: '/all-grievances',
  [ROLES.SUBMITTER]: '/submit-grievance',
};

// Must be a route absent from ROUTE_ROLES — this is the fallback for a role
// string that matches none of the three known roles, and every real content
// route is now role-gated, so pointing this at one of them would send that
// user straight back into the same access check that sent them here,
// looping forever (proxy.ts has no other way out for an "authenticated but
// unrecognized" user — /login itself redirects an authenticated session away).
const DEFAULT_HOME_ROUTE = '/no-access';

function matchedRouteRoles(pathname: string): Role[] | null {
  const route = Object.keys(ROUTE_ROLES).find((r) => pathname === r || pathname.startsWith(`${r}/`));
  return route ? ROUTE_ROLES[route]! : null;
}

/**
 * A JWT with no roles at all is, right now, the *normal* case — this app's
 * own `/register` is the only self-serve path and (per the ROLES comment
 * above) it currently hands back `roles: []`, not a submitter role. Treating
 * that as "no access to anything" would lock every real self-registered user
 * out of Submit Grievance, so an empty list is treated as submitter-equivalent
 * here rather than as "no role". Remove this once the backend actually
 * assigns a role on registration.
 */
function effectiveRoles(roles: string[]): string[] {
  return roles.length > 0 ? roles : [ROLES.SUBMITTER];
}

/**
 * True if the route is explicitly unrestricted, or at least one of `roles`
 * is on its `ROUTE_ROLES` allow-list. Deny-by-default: a route in neither
 * place is blocked, not open — see `UNRESTRICTED_ROUTES`.
 */
export function canAccessRoute(pathname: string, roles: string[]): boolean {
  if (isUnrestrictedRoute(pathname)) return true;
  const allowed = matchedRouteRoles(pathname);
  if (!allowed) return false;
  return effectiveRoles(roles).some((role) => allowed.includes(role as Role));
}

/** The most-privileged role in `roles` (by `ROLE_PRIORITY`) picks the landing route; falls back to the dashboard. */
export function homeRouteForRoles(roles: string[]): string {
  const primary = ROLE_PRIORITY.find((role) => effectiveRoles(roles).includes(role));
  return primary ? ROLE_HOME_ROUTE[primary] : DEFAULT_HOME_ROUTE;
}

/**
 * True for a Grievance Officer or Grievance Admin — the two roles that manage
 * a case rather than just filing or following one. Used inside the grievance
 * detail view to gate case-management controls and internal-only content
 * (case assignment, SLA deferral, internal notes) that a submitter should
 * never see, same unverified-claim caveat as the rest of this file.
 */
export function isOfficerOrAdmin(roles: string[]): boolean {
  return effectiveRoles(roles).some((role) => role === ROLES.OFFICER || role === ROLES.ADMIN);
}

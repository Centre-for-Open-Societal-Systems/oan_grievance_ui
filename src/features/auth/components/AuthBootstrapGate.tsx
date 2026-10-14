'use client';

import { isProtectedRoute } from '@/features/auth/rbac';
import { getMeThunk, logout, selectAuthStatus, selectUser } from '@/features/auth/store/authSlice';
import { onSessionEnded } from '@/lib/api/fetchApi';
import { clearSubmitterProfile } from '@/lib/submitterProfile';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Holds the first paint of a dashboard screen until the session has been
 * restored from the httpOnly cookie via `/api/auth/me`, and starts that
 * restore. Only protected routes are probed — the login/register screens have
 * no session cookie by definition, so asking there is pure noise.
 *
 * Also the other end of a session: when a data request finds it over
 * (`fetchApi`'s refresh refused), a protected screen is left for the login
 * page at once, rather than staying up with every action failing until the
 * next navigation lets `proxy.ts` notice. A public screen (login, register)
 * is left alone — a 401 there just means nobody is signed in.
 */
export function AuthBootstrapGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const userEmail = useAppSelector(selectUser)?.email ?? null;

  const isRestoring = status === 'idle' || status === 'loading';
  const onProtectedRoute = isProtectedRoute(pathname);
  const needsRestore = onProtectedRoute && status === 'idle';

  // Guards against React's double-invoked effect on mount firing two restores.
  const restoreRequested = useRef(false);

  useEffect(() => {
    if (!needsRestore) {
      if (!onProtectedRoute) restoreRequested.current = false;
      return;
    }
    if (restoreRequested.current) return;
    restoreRequested.current = true;
    void dispatch(getMeThunk());
  }, [dispatch, needsRestore, onProtectedRoute]);

  // Several requests can find the session over at once; leave only once.
  const sessionEndHandled = useRef(false);

  useEffect(
    () =>
      onSessionEnded((reason) => {
        const path = window.location.pathname;
        // No user means a logout already under way (performLogout navigates
        // itself, possibly to the identity provider) or a restore that failed.
        if (sessionEndHandled.current || !userEmail || !isProtectedRoute(path)) return;
        sessionEndHandled.current = true;
        dispatch(logout());
        clearSubmitterProfile(userEmail);
        const returnUrl = encodeURIComponent(path + window.location.search);
        // A full navigation, not router.push: nothing from the ended session
        // should survive in memory, and proxy.ts re-checks the cookies on the way.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/login?reason=${reason}&returnUrl=${returnUrl}`);
      }),
    [dispatch, userEmail]
  );

  if (onProtectedRoute && isRestoring) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
        <p className="text-sm font-semibold text-gray-500">Restoring your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}

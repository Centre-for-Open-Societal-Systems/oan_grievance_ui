import { performLogout } from '@/features/auth/logout';
import { isProtectedRoute } from '@/features/auth/rbac';
import { authReducer, getMeThunk } from '@/features/auth/store/authSlice';
import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';

type AuthState = ReturnType<typeof authReducer>;

/**
 * Session-restore failure isn't caught by the route guard (`proxy.ts`) once
 * the page has already rendered — that only runs on navigation. If the
 * cookie backing `getMeThunk` turns out invalid (expired refresh token,
 * revoked session) while the user is sitting on a protected screen, nothing
 * else sends them back to /login. This is the one place that does.
 *
 * Goes through `performLogout` — same as the Sign Out button and the idle
 * timer — rather than reimplementing "revoke + reset Redux" here. This used
 * to dispatch `logout()` and POST /api/auth/logout directly, which quietly
 * skipped whatever `performLogout` does beyond that (currently: clearing
 * `submitterProfile`'s localStorage entry) — a session ending this way would
 * leave that PII behind while every other sign-out path cleared it.
 */
const sessionExpiryMiddleware: Middleware<object, { auth: AuthState }> = (api) => (next) => (action) => {
  const result = next(action);

  if ((action as UnknownAction).type === getMeThunk.rejected.type) {
    // Read before performLogout's dispatch(logout()) clears it.
    const email = api.getState().auth.user?.email ?? null;
    const onProtectedRoute = typeof window !== 'undefined' && isProtectedRoute(window.location.pathname);

    // Fire-and-forget: redirect regardless of whether the server-side revoke succeeds.
    void performLogout(api.dispatch, email).finally(() => {
      if (onProtectedRoute) window.location.href = '/login';
    });
  }

  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sessionExpiryMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

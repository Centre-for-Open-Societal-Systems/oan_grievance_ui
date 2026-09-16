import { isProtectedRoute } from '@/features/auth/rbac';
import { authReducer, getMeThunk, logout } from '@/features/auth/store/authSlice';
import { metadataReducer } from '@/features/metadata/store/metadataSlice';
import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';

/**
 * Session-restore failure isn't caught by the route guard (`proxy.ts`) once
 * the page has already rendered — that only runs on navigation. If the
 * cookie backing `getMeThunk` turns out invalid (expired refresh token,
 * revoked session) while the user is sitting on a protected screen, nothing
 * else sends them back to /login. This is the one place that does.
 */
const sessionExpiryMiddleware: Middleware = (api) => (next) => (action) => {
  const result = next(action);

  if ((action as UnknownAction).type === getMeThunk.rejected.type) {
    api.dispatch(logout());
    if (typeof window !== 'undefined' && isProtectedRoute(window.location.pathname)) {
      // Fire-and-forget: clear the httpOnly cookie server-side too, but redirect
      // regardless of whether that call succeeds.
      fetch('/api/auth/logout', { method: 'POST' })
        .catch(() => {})
        .finally(() => {
          window.location.href = '/login';
        });
    }
  }

  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    metadata: metadataReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sessionExpiryMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { logoutUser } from '@/features/auth/api/authApi';
import { logout } from '@/features/auth/store/authSlice';
import { clearSubmitterProfile } from '@/lib/submitterProfile';
import type { AppDispatch } from '@/store';

/**
 * The single way a session ends: revokes the refresh token server-side, then
 * always resets Redux — a network failure or an already-expired token must
 * not trap the user in a session they asked to leave.
 *
 * `email` is whatever `selectUser` held for this session, if any — it's the
 * key `saveSubmitterProfile` (submitterProfile.ts) used to persist PII to
 * localStorage, so it's what's needed to wipe that PII when the session ends.
 * Callers pass it because it must be read before `dispatch(logout())` clears
 * the very state it lives in.
 *
 * Callers navigate to the login page themselves — except when an IAM session's
 * identity provider could not be signed out server-side: then this navigates
 * the whole page to the provider's logout, so its SSO session ends too, and
 * the provider sends the browser on to the page IAM has configured for it.
 * `redirected` says it did, so the caller skips its own navigation.
 * `providerLoggedOut` says the provider session was ended server-side.
 */
export async function performLogout(
  dispatch: AppDispatch,
  email: string | null
): Promise<{ redirected: boolean; providerLoggedOut: boolean }> {
  const { redirectTo, providerLoggedOut } = await logoutUser();
  dispatch(logout());
  if (email) clearSubmitterProfile(email);
  if (!redirectTo) return { redirected: false, providerLoggedOut };
  window.location.assign(redirectTo);
  return { redirected: true, providerLoggedOut };
}

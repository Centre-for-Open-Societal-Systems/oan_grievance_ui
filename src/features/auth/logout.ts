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
 * `returnTo` is where the user lands afterwards. Callers navigate there
 * themselves — except for a staff (IAM) session, where this navigates the
 * whole page to the identity provider's logout instead, so its SSO session
 * ends too, and the provider sends the browser on to `returnTo`. Returns
 * whether it did, so the caller skips its own navigation.
 */
export async function performLogout(
  dispatch: AppDispatch,
  email: string | null,
  returnTo = '/login'
): Promise<boolean> {
  const providerLogoutUrl = await logoutUser(returnTo);
  dispatch(logout());
  if (email) clearSubmitterProfile(email);
  if (!providerLogoutUrl) return false;
  window.location.assign(providerLogoutUrl);
  return true;
}

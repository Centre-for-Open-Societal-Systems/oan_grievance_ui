import { logoutUser } from '@/features/auth/api/authApi';
import { logout } from '@/features/auth/store/authSlice';
import type { AppDispatch } from '@/store';

/**
 * The single way a session ends: revokes the refresh token server-side, then
 * always resets Redux — a network failure or an already-expired token must
 * not trap the user in a session they asked to leave.
 */
export async function performLogout(dispatch: AppDispatch): Promise<void> {
  await logoutUser();
  dispatch(logout());
}

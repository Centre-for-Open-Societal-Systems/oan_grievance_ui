'use client';

import { canManageNotifications } from '@/features/auth/rbac';
import { selectUser } from '@/features/auth/store/authSlice';
import { useAppSelector } from '@/store/hooks';

/** Whether the signed-in user may edit notification templates; false until roles load. */
export function useCanManageNotifications(): boolean {
  const user = useAppSelector(selectUser);
  return canManageNotifications(user?.roles ?? []);
}

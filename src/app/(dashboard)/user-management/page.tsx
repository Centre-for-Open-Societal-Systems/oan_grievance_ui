import UserManagementPage from '@/features/user-management/page';
import { Suspense } from 'react';

export default function UsersRoute() {
  return (
    <Suspense>
      <UserManagementPage />
    </Suspense>
  );
}


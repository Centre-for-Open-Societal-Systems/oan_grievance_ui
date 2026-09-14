import React from 'react';
import { TopHeader } from '@/features/user-management/components/TopHeader';
import { KPICard } from '@/features/user-management/components/KPICard';
import { UserTable } from '@/features/user-management/components/UserTable';

export default function UserManagementPage() {
    return (
        <div className="flex flex-col gap-6 h-full font-sans">
            <TopHeader />
            <KPICard />
            <UserTable />
        </div>

    );
}

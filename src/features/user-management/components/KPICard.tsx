'use client';

import { useEffect, useState } from 'react';
import { Users, ClipboardList, XCircle } from 'lucide-react';
import { users as initialUsers, type User } from './UserTable';

export function KPICard() {
  const [userList, setUserList] = useState<User[]>(initialUsers);

  useEffect(() => {
    const handleUserListChanged = (e: Event) => {
      setUserList((e as CustomEvent<User[]>).detail);
    };
    window.addEventListener('userListChanged', handleUserListChanged);
    return () => window.removeEventListener('userListChanged', handleUserListChanged);
  }, []);

  const total = userList.length;
  const active = userList.filter((u) => u.status === 'Active').length;
  const inactive = userList.filter((u) => u.status === 'Inactive').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Users Card */}
      <div className="group bg-white p-6 rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex justify-between items-center cursor-pointer">
        <div className="flex flex-col gap-1">
          <p className="text-[#64748b] text-sm font-medium">Total Users</p>
          <p className="text-3xl font-bold text-[#1e293b]">{total}</p>
        </div>
        <div className="w-16 h-16 flex items-center justify-center bg-[#eff6ff] text-[#2563eb] rounded-2xl transition-colors duration-300">
          <Users size={32} strokeWidth={2} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
        </div>
      </div>

      {/* Active Card */}
      <div className="group bg-white p-6 rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex justify-between items-center cursor-pointer">
        <div className="flex flex-col gap-1">
          <p className="text-[#64748b] text-sm font-medium">Active</p>
          <p className="text-3xl font-bold text-[#1e293b]">{active}</p>
        </div>
        <div className="w-16 h-16 flex items-center justify-center bg-[#dcfce7] text-[#16a34a] rounded-2xl transition-colors duration-300">
          <ClipboardList size={32} strokeWidth={2} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
        </div>
      </div>

      {/* Inactive Card */}
      <div className="group bg-white p-6 rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex justify-between items-center cursor-pointer">
        <div className="flex flex-col gap-1">
          <p className="text-[#64748b] text-sm font-medium">Inactive</p>
          <p className="text-3xl font-bold text-[#1e293b]">{inactive}</p>
        </div>
        <div className="w-16 h-16 flex items-center justify-center bg-[#fee2e2] text-[#dc2626] rounded-2xl transition-colors duration-300">
          <XCircle size={32} strokeWidth={2} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddUserModal } from './AddUserModal';

export function TopHeader() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl p-6 border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage system users and their permissions
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#16a34a] hover:bg-[#10883c] text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
        >
          <Plus size={18} />
          Add Team Members
        </button>
      </div>

      <AddUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

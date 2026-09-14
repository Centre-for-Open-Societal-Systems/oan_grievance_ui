import React from 'react';
import { X } from 'lucide-react';
import { Grievance } from '../../mockData';

interface SidebarHeaderProps {
  grievance: Grievance;
  onClose: () => void;
}

export function SidebarHeader({ grievance, onClose }: SidebarHeaderProps) {
  return (
    <div className="flex items-start justify-between pl-8 pr-6 py-5 bg-white border-b border-gray-200">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{grievance.ticketId}</span>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200/60">{grievance.status}</span>
          <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200/60 text-xs font-bold rounded-full">{grievance.priority}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{grievance.title}</h2>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-red-500/30"
        title="Close"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}

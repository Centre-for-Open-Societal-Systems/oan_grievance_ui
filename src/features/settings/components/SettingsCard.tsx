import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SettingsCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export function SettingsCard({ title, description, icon, onClick }: SettingsCardProps) {
  return (
    <div
      onClick={onClick}
      className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-gray-200 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#0b5c36]/10 group-hover:scale-110 transition-all duration-300">
          <div className="text-[#475569] group-hover:text-[#0b5c36] transition-colors">
            {icon}
          </div>
        </div>

      </div>
    </div>
  );
}

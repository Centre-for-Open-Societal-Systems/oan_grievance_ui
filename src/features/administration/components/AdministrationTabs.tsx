import React from 'react';
import { UserCog, Shield, GitBranch, History, Mail, FileText } from 'lucide-react';

interface AdministrationTabsProps {
  activeTab: string;
  onTabChange: (tabName: string) => void;
}

export function AdministrationTabs({ activeTab, onTabChange }: AdministrationTabsProps) {
  const tabs = [
    { name: 'Nodal Officers (L1)', icon: UserCog, active: activeTab === 'Nodal Officers (L1)' },
    { name: 'Senior Nodal Officers (L2)', icon: Shield, active: activeTab === 'Senior Nodal Officers (L2)' },
    { name: 'Category Assignments', icon: GitBranch, active: activeTab === 'Category Assignments' },
    { name: 'SLA Configuration', icon: History, active: activeTab === 'SLA Configuration' },
    { name: 'Notification Config', icon: Mail, active: activeTab === 'Notification Config' },
    { name: 'Response Templates', icon: FileText, active: activeTab === 'Response Templates' },
  ];

  return (
    <div className="bg-gray-50 rounded-xl p-2 border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <div
        className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden gap-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => onTabChange(tab.name)}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-6 flex-1 min-w-[160px] rounded-xl transition-all duration-200 ${tab.active
              ? 'bg-white border border-gray-200 shadow-sm text-slate-700 font-semibold'
              : 'border border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
              }`}
          >
            <tab.icon size={26} className={tab.active ? 'text-[#16A34A]' : 'text-gray-500'} />
            <span className={`text-[14px] whitespace-nowrap font-semibold`}>{tab.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

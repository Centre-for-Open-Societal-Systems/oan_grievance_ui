import { GitBranch, Mail, FileText } from 'lucide-react';

interface AdministrationTabsProps {
  activeTab: string;
  onTabChange: (tabName: string) => void;
}

export function AdministrationTabs({ activeTab, onTabChange }: AdministrationTabsProps) {
  const tabs = [
    { name: 'Category & SLA Configuration', icon: GitBranch, active: activeTab === 'Category & SLA Configuration' },
    { name: 'Notification Config', icon: Mail, active: activeTab === 'Notification Config' },
    { name: 'Response Templates', icon: FileText, active: activeTab === 'Response Templates' },
  ];

  return (
    <div className="bg-gray-50 rounded-xl p-1.5 border border-[#F1F3F4] overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => onTabChange(tab.name)}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-lg whitespace-nowrap transition-all duration-200 ${tab.active
              ? 'bg-white border border-gray-200 shadow-sm text-slate-800 font-semibold'
              : 'border border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/70'
              }`}
          >
            <tab.icon size={16} className={`shrink-0 ${tab.active ? 'text-[#16A34A]' : 'text-gray-400'}`} />
            <span className="text-[13px] font-medium">{tab.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import { Info } from 'lucide-react';
import { NotificationCard } from './components/NotificationCard';
import { MOCK_CORE_NOTIFICATIONS, MOCK_ESCALATION_NOTIFICATIONS } from './components/types';

export default function NotificationConfigPage() {
    return (
        <div className="w-full flex flex-col h-[calc(100vh-230px)] bg-white border border-gray-200 rounded-xl overflow-hidden font-sans">

            {/* Info Banner (Fixed) */}
            <div className="p-6 pb-4 shrink-0 border-b border-gray-200 bg-white z-10">
                <div className="flex items-center gap-2 bg-[#F0F7FF] border border-[#D6E8FF] rounded-lg p-3">
                    <Info className="w-4 h-4 text-[#1447E6] shrink-0" />
                    <span className="text-xs font-semibold text-[#1447E6]">
                        FSD Appendix C — 19-event notification matrix. Use template variables: {'{{id}}'}, {'{{date}}'}, {'{{category}}'}, {'{{officerName}}'}, {'{{statusLine}}'}
                    </span>
                </div>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="p-6 flex flex-col">
                    <NotificationCard notifications={[...MOCK_CORE_NOTIFICATIONS, ...MOCK_ESCALATION_NOTIFICATIONS]} />
                </div>
            </div>

        </div>
    );
}

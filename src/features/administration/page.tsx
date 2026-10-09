"use client";

import { useState } from 'react';
import { TopHeader } from './components/TopHeader';
import { AdministrationTabs } from './components/AdministrationTabs';
import CategorySlaConfigurationPage from './tabs-pages/category-sla-configuration/page';
import NotificationConfigPage from './tabs-pages/notification-config/page';
import ResponseTemplatesPage from './tabs-pages/response-templates/page';

export default function AdministrationPage() {
    const [activeTab, setActiveTab] = useState('Category & SLA Configuration');

    return (
        <div className="flex flex-col gap-6 font-sans pb-0">

            {/* Header */}
            <TopHeader activeTab={activeTab} />

            <AdministrationTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'Category & SLA Configuration' ? (
                <CategorySlaConfigurationPage />
            ) : activeTab === 'Notification Config' ? (
                <NotificationConfigPage />
            ) : activeTab === 'Response Templates' ? (
                <ResponseTemplatesPage />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500 font-medium">
                    Content for {activeTab} is under construction.
                </div>
            )}

        </div>
    );
}

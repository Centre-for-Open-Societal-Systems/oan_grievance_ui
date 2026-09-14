"use client";

import React, { useState } from 'react';
import { TopHeader } from './components/TopHeader';
import { AdministrationTabs } from './components/AdministrationTabs';
import { NodalOfficersL1 } from './tabs-pages/nodal-officers/page';
import { SeniorNodalOfficersL2 } from './tabs-pages/senior-nodal-officers/page';
import CategoryAssignmentsPage from './tabs-pages/category-assignments/page';
import SlaConfigurationPage from './tabs-pages/sla-configuration/page';
import NotificationConfigPage from './tabs-pages/notification-config/page';
import ResponseTemplatesPage from './tabs-pages/response-templates/page';

export default function AdministrationPage() {
    const [activeTab, setActiveTab] = useState('Nodal Officers (L1)');

    return (
        <div className="flex flex-col gap-6 font-sans pb-0 ">

            {/* Header */}
            <TopHeader />

            <AdministrationTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'Nodal Officers (L1)' ? (
                <NodalOfficersL1 />
            ) : activeTab === 'Senior Nodal Officers (L2)' ? (
                <SeniorNodalOfficersL2 />
            ) : activeTab === 'Category Assignments' ? (
                <CategoryAssignmentsPage />
            ) : activeTab === 'SLA Configuration' ? (
                <SlaConfigurationPage />
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

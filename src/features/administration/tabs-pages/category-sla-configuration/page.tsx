"use client";

import { GlobalSlaPolicyCard } from './components/GlobalSlaPolicyCard';
import { SlaCategoryCard } from './components/SlaCategoryCard';
import { MOCK_SLA_CATEGORIES } from './components/types';

export default function CategorySlaConfigurationPage() {
    return (
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm h-[calc(100vh-230px)] flex flex-col overflow-hidden">
            {/* Top Header Section */}
            <div className="flex-none pt-6 pb-4 px-6 mb-3 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Per-Category SLA Windows</h2>
                <p className="text-sm text-gray-500">
                    Edit the SLA deadline and escalation behaviour for each service category.
                </p>
            </div>

            {/* Scrollable Content (Global Policy + Categories) */}
            <div className="flex-1 overflow-y-auto p-6 pt-2 flex flex-col [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">

                <GlobalSlaPolicyCard />

                <div className="flex flex-col">
                    {MOCK_SLA_CATEGORIES.map((category) => (
                        <SlaCategoryCard
                            key={category.id}
                            categoryData={category}
                        />
                    ))}
                </div>

            </div>
        </div>
    );
}

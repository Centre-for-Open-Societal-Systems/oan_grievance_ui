"use client";

import React from 'react';
import { GlobalSlaPolicyCard } from './components/GlobalSlaPolicyCard';
import { SlaCategoryCard } from './components/SlaCategoryCard';
import { MOCK_SLA_CATEGORIES } from './components/types';

export default function SlaConfigurationPage() {
    return (
        <div className="w-full flex flex-col h-[calc(100vh-120px)] min-h-[750px]">

            {/* CARD 1 (Fixed) */}
            <div className="shrink-0">
                <GlobalSlaPolicyCard />
            </div>

            {/* CARD 2 (Scrollable List) */}
            <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="p-6 pb-4 shrink-0 border-b border-gray-200 bg-white z-10">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">Per-Category SLA Windows</h2>
                    <p className="text-sm text-gray-500">Edit the SLA deadline and escalation behaviour for each service category.</p>
                </div>

                <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="p-6 flex flex-col">
                        {MOCK_SLA_CATEGORIES.map((category) => (
                            <SlaCategoryCard
                                key={category.id}
                                categoryData={category}
                            />
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}

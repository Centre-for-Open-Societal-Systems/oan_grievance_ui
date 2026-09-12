"use client";

import React, { useState } from 'react';
import { Save } from 'lucide-react';

export function GlobalSlaPolicyCard() {
    const [deferralPolicy, setDeferralPolicy] = useState('l2');

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 mb-6">
            <div className="p-6 pb-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Global SLA Policy</h2>
                <p className="text-sm text-gray-500">System-wide defaults applied across all grievance categories unless overridden.</p>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-800">Max SLA Deferral (days)</label>
                        <input
                            type="text"
                            defaultValue="30"
                            className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum days any single deferral request may add to the SLA clock.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-800">Auto-escalate Threshold (%)</label>
                        <input
                            type="text"
                            defaultValue="100"
                            className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Escalate when SLA is consumed by this percentage (100% = at deadline).</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <span className="text-sm font-medium text-gray-500">Deferral Approval Policy</span>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-5 h-5">
                                <input
                                    type="radio"
                                    name="deferralPolicy"
                                    value="l2"
                                    checked={deferralPolicy === 'l2'}
                                    onChange={(e) => setDeferralPolicy(e.target.value)}
                                    className="peer sr-only"
                                />
                                <div className="w-5 h-5 border border-gray-300 rounded-full group-hover:border-[#16A34A] peer-checked:border-[#16A34A] transition-colors"></div>
                                {deferralPolicy === 'l2' && (
                                    <div className="absolute w-2.5 h-2.5 bg-[#16A34A] rounded-full"></div>
                                )}
                            </div>
                            <span className="text-sm font-medium text-gray-800">Require L2 Senior Officer approval</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-5 h-5">
                                <input
                                    type="radio"
                                    name="deferralPolicy"
                                    value="l1"
                                    checked={deferralPolicy === 'l1'}
                                    onChange={(e) => setDeferralPolicy(e.target.value)}
                                    className="peer sr-only"
                                />
                                <div className="w-5 h-5 border border-gray-300 rounded-full group-hover:border-[#16A34A] peer-checked:border-[#16A34A] transition-colors"></div>
                                {deferralPolicy === 'l1' && (
                                    <div className="absolute w-2.5 h-2.5 bg-[#16A34A] rounded-full"></div>
                                )}
                            </div>
                            <span className="text-sm font-medium text-gray-800">L1 officer self-approve (not recommended)</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="px-6 pt-4 pb-4 border-t border-gray-200 flex justify-end bg-white rounded-b-xl">
                <button className="flex items-center gap-2 bg-[#16A34A] hover:bg-[#10883c] text-white px-5 py-3 rounded-lg font-bold transition-colors text-sm">
                    <Save className="w-4 h-4" />
                    Save Global Policy
                </button>
            </div>
        </div>
    );
}

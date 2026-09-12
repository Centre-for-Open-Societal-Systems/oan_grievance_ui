"use client";

import React, { useState } from 'react';
import { Zap, Bell, BellOff, Edit2, Save } from 'lucide-react';
import { SlaCategory } from './types';

interface SlaCategoryCardProps {
    categoryData: SlaCategory;
    isLast?: boolean;
}

export function SlaCategoryCard({ categoryData, isLast = false }: SlaCategoryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [autoEscalate, setAutoEscalate] = useState(categoryData.autoEscalate);
    const [notifyOnEscalation, setNotifyOnEscalation] = useState(categoryData.notifyOnEscalation);
    const [slaDays, setSlaDays] = useState(categoryData.slaDays);

    const reminderDays = Math.round(slaDays * 0.5);
    const urgentDays = Math.round(slaDays * 0.8);

    return (
        <div className={`bg-white border border-gray-200 ${isLast ? 'mb-0' : 'mb-4'} last:mb-0 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl`}>
            {/* Header (always visible) */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-6 flex-1">
                    <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${categoryData.categoryColor} w-24 text-center shrink-0`}>
                        {categoryData.category}
                    </div>

                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <div className='flex justify-between'>
                            <span className="text-sm font-medium text-gray-900 truncate">
                                {categoryData.department}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                                <div
                                    className="h-full bg-[#16A34A] rounded-full"
                                    style={{ width: `${categoryData.progressPercentage || 80}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className='flex justify-end'>
                            <span className="text-xs font-semibold text-gray-700">{categoryData.slaDays} days</span>
                        </div>

                    </div>
                </div>

                <div className="flex items-center gap-6 ml-6 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Zap className={`w-3.5 h-3.5 ${categoryData.autoEscalate ? 'text-orange-500' : 'text-gray-300'}`} fill={categoryData.autoEscalate ? "currentColor" : "none"} />
                        <span className="text-xs text-gray-600 font-medium">Auto-escalate</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {categoryData.notifyOnBreach ? (
                            <Bell className="w-3.5 h-3.5 text-blue-500" fill="currentColor" stroke="currentColor" strokeWidth={1} />
                        ) : (
                            <BellOff className="w-3.5 h-3.5 text-gray-300" strokeWidth={2} />
                        )}
                        <span className="text-xs text-gray-600 font-medium">Notify on breach</span>
                    </div>

                    {categoryData.priority ? (
                        <span className="bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {categoryData.priority}
                        </span>
                    ) : (
                        <div className="w-20"></div> /* Placeholder for alignment */
                    )}

                    <button
                        className="ml-2 p-2 rounded-full border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Expanded Form */}
            {isExpanded && (
                <div className="border-t border-gray-100 bg-white">
                    <div className="p-0">
                        <div className=' bg-[#ECECF0]/30 p-6'>
                            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-8 mb-8">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-gray-800">
                                        SLA Days <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={slaDays}
                                        onChange={(e) => setSlaDays(parseInt(e.target.value) || 0)}
                                        placeholder="Enter SLA Days"
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                                    />
                                </div>

                                <div className="flex flex-col gap-3">
                                    <span className="text-[13px] font-medium text-gray-500">Auto-escalate on breach</span>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="flex items-center cursor-pointer w-max">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={autoEscalate}
                                                    onChange={() => setAutoEscalate(!autoEscalate)}
                                                />
                                                <div className={`block w-9 h-5 rounded-full transition-colors ${autoEscalate ? 'bg-[#16A34A]' : 'bg-gray-300'}`}></div>
                                                <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform transform shadow-sm ${autoEscalate ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                            <div className="ml-3 text-sm text-gray-500">{autoEscalate ? 'Enabled' : 'Disabled'}</div>
                                        </label>
                                        <span className="text-[11px] text-gray-500">Triggers EC-016 SLA breach notification</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <span className="text-[13px] font-medium text-gray-500">Notify on escalation</span>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="flex items-center cursor-pointer w-max">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={notifyOnEscalation}
                                                    onChange={() => setNotifyOnEscalation(!notifyOnEscalation)}
                                                />
                                                <div className={`block w-9 h-5 rounded-full transition-colors ${notifyOnEscalation ? 'bg-[#16A34A]' : 'bg-gray-300'}`}></div>
                                                <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform transform shadow-sm ${notifyOnEscalation ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                            <div className="ml-3 text-sm text-gray-500">{notifyOnEscalation ? 'Enabled' : 'Disabled'}</div>
                                        </label>
                                        <span className="text-[11px] text-gray-500">Triggers EC-016 SLA breach notification</span>
                                    </div>
                                </div>
                            </div>

                            {/* Milestone Preview */}
                            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-2">
                                <h4 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-4">SLA Milestone Preview</h4>

                                <div className="relative flex items-center h-[2px] w-full mt-2 mb-10">
                                    {/* Segments */}
                                    <div className="w-[50%] h-full bg-[#16A34A]"></div>
                                    <div className="w-[30%] h-full bg-orange-400"></div>
                                    <div className="w-[20%] h-full bg-red-500"></div>

                                    {/* Dots */}
                                    <div className="absolute left-[0%] top-1/2 -translate-x-1/2 flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A] -mt-[5px]"></div>
                                        <div className="flex flex-col items-center mt-2">
                                            <span className="text-[12px] text-gray-500 whitespace-nowrap">Submit</span>
                                        </div>
                                    </div>
                                    <div className="absolute left-[50%] top-1/2 -translate-x-1/2 flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A] -mt-[5px]"></div>
                                        <div className="flex flex-col items-center mt-2">
                                            <span className="text-[12px] text-gray-500 whitespace-nowrap">50% reminder</span>
                                            <span className="text-[14px] font-bold text-gray-800">{reminderDays}d</span>
                                        </div>
                                    </div>
                                    <div className="absolute left-[80%] top-1/2 -translate-x-1/2 flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-400 -mt-[5px]"></div>
                                        <div className="flex flex-col items-center mt-2">
                                            <span className="text-[12px] text-gray-500 whitespace-nowrap">80% urgent</span>
                                            <span className="text-[14px] font-bold text-gray-800">{urgentDays}d</span>
                                        </div>
                                    </div>
                                    <div className="absolute left-[100%] top-1/2 -translate-x-1/2 flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -mt-[5px]"></div>
                                        <div className="flex flex-col items-center mt-2">
                                            <span className="text-[12px] text-gray-500 whitespace-nowrap">Deadline</span>
                                            <span className="text-[14px] font-bold text-gray-800">{slaDays}d</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 py-6 px-6 border-t border-[#ECECF0]">
                            <button
                                className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                onClick={() => setIsExpanded(false)}
                            >
                                Cancel
                            </button>
                            <button className="px-6 py-2.5 text-sm font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#10883c] transition-colors flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                Save SLA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

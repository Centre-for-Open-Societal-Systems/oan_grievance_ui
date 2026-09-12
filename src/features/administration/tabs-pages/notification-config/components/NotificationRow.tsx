"use client";

import React, { useState } from 'react';
import { Pencil, FileText, X } from 'lucide-react';
import { NotificationConfig } from './types';
import { TemplateBody } from './TemplateBody';

interface NotificationRowProps {
    notification: NotificationConfig;
    isLast?: boolean;
}

export function NotificationRow({ notification, isLast }: NotificationRowProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isActive, setIsActive] = useState(notification.active);
    const [activeChannels, setActiveChannels] = useState<string[]>(notification.channel || []);
    const [activeRecipients, setActiveRecipients] = useState<string[]>(notification.recipients || []);
    const [subject, setSubject] = useState(notification.subject || '');
    const [body, setBody] = useState(notification.template || '');

    const toggleChannel = (channel: string) => {
        if (activeChannels.includes(channel)) {
            setActiveChannels(activeChannels.filter(c => c !== channel));
        } else {
            setActiveChannels([...activeChannels, channel]);
        }
    };

    const toggleRecipient = (recipient: string) => {
        if (activeRecipients.includes(recipient)) {
            setActiveRecipients(activeRecipients.filter(r => r !== recipient));
        } else {
            setActiveRecipients([...activeRecipients, recipient]);
        }
    };

    const allRecipients = ['Submitter', 'L1 Officer', 'L2 Officer', 'Dept Head', 'Nodal Officer', 'Top-level Authority'];

    return (
        <div className={`bg-white border border-gray-200 rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 overflow-hidden ${isLast ? 'mb-0' : 'mb-4'} last:mb-0`}>
            <div className="bg-white p-6 flex items-center justify-between">
                <div className="flex-1">
                    {/* Header Row */}
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-[12px] font-medium text-gray-500 w-12 shrink-0">{notification.id}</span>
                        <span className="text-sm font-medium text-gray-900">{notification.title || notification.eventType}</span>

                        {/* Badges */}
                        <div className="flex items-center gap-2 ml-4">
                            <span className={`px-3 py-0.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-[#DCFCE7] text-[#008236] border border-[#92F2B3]' : 'bg-[#F1F1F4] text-[#717182] border border-[#D4DBE9]'}`}>
                                {isActive ? 'Active' : 'Disabled'}
                            </span>
                            {activeChannels.map(channel => (
                                <span
                                    key={channel}
                                    className={`px-2 py-0.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${channel === 'SMS' ? 'bg-[#FFF7D8] border-[#FEE685] text-[#BB4D00]' : 'bg-[#EFF6FF] border-[#C9E0FF] text-[#1447E6]'
                                        }`}
                                >
                                    {channel}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Subtitle */}
                    <div className="ml-[0px]">
                        <p className="text-[14px] text-gray-600 mb-1">{notification.subject}</p>
                        <div className="flex items-center gap-2 text-[12px] text-gray-500">
                            <span className='font-medium'>Trigger: <span className='font-semibold'>{notification.trigger}</span></span>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1.5">
                                <span className='font-medium'>To:</span>
                                {activeRecipients.map((recipient, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded-xl font- text-gray-600 bg-[#F1F1F4] text-[#717182] border border-[#D4DBE9]">{recipient}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors duration-300 ease-in-out ${isActive ? 'bg-[#16A34A]' : 'bg-gray-300'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-all duration-300 ease-in-out transform shadow-sm ${isActive ? 'translate-x-5' : ''}`}></div>
                    </label>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`relative w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-300 active:scale-95 ${isExpanded ? 'bg-[#F7F8FA] border-[#E8F0FF]' : 'bg-white hover:bg-[#F1F1F4] border-[#E8F0FF]'}`}
                    >
                        <X className={`absolute w-4 h-4 text-gray-500 transition-all duration-300 ${isExpanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
                        <Pencil className={`absolute w-4 h-4 text-gray-500 transition-all duration-300 ${!isExpanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`} />
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-100">
                    <div className="p-6 px-6 bg-[#ECECF0]/20 border-b border-t border-gray-200">
                        <div className="flex gap-12 mb-8">
                            <div className="flex-[2]">
                                <label className="block text-[13px] font-medium text-gray-500 mb-2">
                                    Email Subject <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[14px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[13px] font-medium text-gray-500 mb-2">Channels</label>
                                <div className="flex items-center gap-3">
                                    {['SMS', 'Email'].map(channel => (
                                        <button
                                            key={channel}
                                            onClick={() => toggleChannel(channel)}
                                            className={`px-5 py-1.5 rounded-full text-[13px] font-medium transition-colors border ${activeChannels.includes(channel)
                                                ? 'bg-[#DCFCE7] text-[#008236] border-[#99E8B5]'
                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {channel}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-[13px] font-medium text-gray-500 mb-2">Recipients</label>
                            <div className="flex flex-wrap gap-3">
                                {allRecipients.map(recipient => {
                                    const isSelected = activeRecipients.includes(recipient);
                                    return (
                                        <button
                                            key={recipient}
                                            onClick={() => toggleRecipient(recipient)}
                                            className={`px-5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${isSelected
                                                ? 'bg-[#DCFCE7] text-[#008236] border-[#99E8B5]'
                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {recipient}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <TemplateBody value={body} onChange={setBody} />

                    </div>
                    <div className="bg-white p-6 px-8 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#10883c] transition-colors">
                            <FileText className="w-4 h-4" />
                            Save Template
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

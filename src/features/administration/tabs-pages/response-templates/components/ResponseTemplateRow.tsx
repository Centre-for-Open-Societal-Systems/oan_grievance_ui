import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Pencil, Copy } from 'lucide-react';
import { ResponseTemplate } from './types';

interface ResponseTemplateRowProps {
    template: ResponseTemplate;
    isLast?: boolean;
}

export function ResponseTemplateRow({ template, isLast }: ResponseTemplateRowProps) {
    const [isExpanded, setIsExpanded] = useState(template.id === 'RT-001');

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Resolved':
                return 'bg-[#E1F9E8] text-[#1A9F53] border-[#B7ECC9]';
            case 'Partially Resolved':
                return 'bg-[#E1EDFF] text-[#2F65CB] border-[#C3DDFD]';
            case 'Requires further info':
                return 'bg-[#FFF3E5] text-[#D0621D] border-[#FBD6B7]';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-200 rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300  ${!isLast ? 'mb-4' : ''}`}>
            {/* Header Row */}
            <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-[#078930]/10 border border-[#078930]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[#16A34A]" />
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-medium text-gray-500">{template.id}</span>
                            <span className="text-[14px] font-semibold text-gray-900">{template.title}</span>
                        </div>
                        <div className="text-[13px] text-gray-500">
                            {template.category} • {template.subcategory}
                        </div>
                    </div>
                </div>

                {/* Right side: Badges and Chevron */}
                <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border ${getStatusStyles(template.statusBadge)}`}>
                        {template.statusBadge}
                    </span>
                    <div className="flex flex-col justify-center">
                        <span className="text-[11px] text-[#717182] font-medium leading-none mb-1">Used</span>
                        <span className="text-[14px] text-[#0A0A0A] font-semibold text-center leading-none">{template.useCount}×</span>
                    </div>
                    <button
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-100 bg-white">
                    <div className="p-6 px-8 bg-[#ECECF0]/30 border-t border-gray-200">
                        <div className="mb-6">
                            <h4 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1">ACTION TAKEN</h4>
                            <p className="text-[14px] text-gray-800 leading-relaxed">
                                {template.actionTaken}
                            </p>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1">RESOLUTION SUMMARY</h4>
                            <p className="text-[14px] text-gray-800 leading-relaxed">
                                {template.resolutionSummary}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white border-t border-gray-200 px-8 py-4 rounded-b-xl">
                        <div className="flex items-center justify-end gap-4">
                            <div className="flex items-center gap-4 text-[12px] text-gray-600 font-medium mr-auto">
                                <span>Last used: {template.lastUsed}</span>
                                <span>Used {template.useCount} times</span>
                            </div>

                            <button className="px-5 py-3 border border-gray-200 rounded-lg text-[14px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                                <Pencil className="w-4 h-4" />
                                Edit Template
                            </button>
                            <button className="px-5 py-3 bg-[#16A34A] text-white rounded-lg text-[14px] font-bold hover:bg-[#15803d] flex items-center gap-2 transition-colors">
                                <Copy className="w-4 h-4" />
                                Copy to Response Form
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

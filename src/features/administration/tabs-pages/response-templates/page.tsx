"use client";

import { useMemo, useState } from 'react';
import { Search, Info } from 'lucide-react';
import { MOCK_RESPONSE_TEMPLATES } from './components/types';
import { ResponseTemplateRow } from './components/ResponseTemplateRow';
import { CategoryDropdown } from './components/CategoryDropdown';

export default function ResponseTemplatesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const filteredTemplates = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        return MOCK_RESPONSE_TEMPLATES.filter((template) => {
            const matchesSearch = search === '' ||
                template.title.toLowerCase().includes(search) ||
                template.subcategory.toLowerCase().includes(search);
            const matchesCategory = selectedCategory === '' || template.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory]);

    return (
        <div className="w-full flex flex-col h-[calc(100vh-230px)] bg-white border border-gray-200 rounded-xl overflow-hidden">

            {/* Header - Fixed at top */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 shrink-0">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search response templates..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <CategoryDropdown onChange={setSelectedCategory} />

                    <button className="mt-5 px-4 py-2.5 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803d] transition-colors">
                        + Add Template
                    </button>
                </div>
            </div>

            {/* Scrollable Area - Flush with edges */}
            <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="p-6">
                    {/* Info Banner */}
                    <div className="flex items-center gap-2 bg-[#F0F7FF] border border-[#D6E8FF] rounded-lg p-3 mb-6 shrink-0">
                        <Info className="w-4 h-4 text-[#1447E6] shrink-0" />
                        <span className="text-xs font-semibold text-[#1447E6]">
                            FSD Appendix C — 19-event notification matrix. Use template variables: {'{{id}}'} {'{{name}}'} {'{{category}}'} {'{{officerName}}'} {'{{slaDeadline}}'}
                        </span>
                    </div>

                    {/* Templates List */}
                    <div className="flex flex-col">
                        {filteredTemplates.map((template, index) => (
                            <ResponseTemplateRow
                                key={template.id}
                                template={template}
                                isLast={index === filteredTemplates.length - 1}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

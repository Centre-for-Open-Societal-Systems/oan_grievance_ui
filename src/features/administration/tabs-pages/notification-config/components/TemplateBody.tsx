import React from 'react';

interface TemplateBodyProps {
    value: string;
    onChange: (value: string) => void;
}

export function TemplateBody({ value, onChange }: TemplateBodyProps) {
    return (
        <div className="mb-6">
            <label className="block text-[13px] font-medium text-gray-500 mb-2">Template Body</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 text-[14px] text-gray-700 min-h-50 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] resize-none leading-relaxed"
                placeholder="Enter template body here..."
            />
        </div>
    );
}

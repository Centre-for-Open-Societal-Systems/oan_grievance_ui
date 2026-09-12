import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CATEGORIES = [
    'Inputs',
    'Schemes',
    'Payments',
    'Credit',
    'Markets'
];

export function CategoryDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col relative" ref={dropdownRef}>
            <label className="text-[14px] font-bold text-[#4B5563] mb-1">
                Service Category <span className="text-red-500">*</span>
            </label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between px-4 py-2 bg-white border rounded-lg text-[15px] text-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] min-w-[240px] transition-colors ${isOpen ? 'border-[#16A34A] ring-1 ring-[#16A34A]' : 'border-gray-200'}`}
            >
                <span className={selected ? 'text-gray-900 font-medium' : 'text-[#6B7280] font-medium'}>
                    {selected || 'Select Service Category'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    <ul className="max-h-[220px] overflow-y-auto py-1 [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                        {CATEGORIES.map((category) => (
                            <li
                                key={category}
                                onClick={() => {
                                    setSelected(category);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-2.5 text-[15px] cursor-pointer hover:bg-gray-50 transition-colors ${selected === category ? 'bg-[#F0FDF4] text-[#16A34A] font-medium' : 'text-[#4B5563]'}`}
                            >
                                {category}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

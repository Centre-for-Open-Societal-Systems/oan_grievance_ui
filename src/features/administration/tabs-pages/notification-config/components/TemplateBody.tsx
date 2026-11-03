"use client";

import { useRef } from 'react';
import { Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PlaceholderItem } from './types';

export const DEFAULT_PLACEHOLDERS: PlaceholderItem[] = [
    { key: '{ticket_number}', field: 'ticket_number', label: 'Ticket Number', description: 'Unique grievance identifier, e.g. TKT-2026-00001', example: 'TKT-2026-00001' },
    { key: '{service_category}', field: 'service_category', label: 'Category', description: 'Primary service category name', example: 'Input Subsidies' },
    { key: '{grievance_type}', field: 'grievance_type', label: 'Type', description: 'Specific issue classification', example: 'Delayed Distribution' },
    { key: '{status}', field: 'status', label: 'Status', description: 'Current lifecycle status (e.g. In Progress, Resolved)', example: 'In Progress' },
    { key: '{assigned_to}', field: 'assigned_to', label: 'Assigned Officer', description: 'User identifier or email of assigned officer', example: 'officer@example.gov.et' },
    { key: '{sla_due_date}', field: 'sla_due_date', label: 'SLA Deadline', description: 'Calculated resolution SLA deadline timestamp', example: '2026-04-15 17:00:00' },
    { key: '{state_deadline}', field: 'state_deadline', label: 'Stage Deadline', description: 'Target deadline for current workflow stage', example: '2026-04-10 17:00:00' },
    { key: '{submitter_name}', field: 'submitter_name', label: 'Submitter Name', description: 'Name of the person or entity submitting', example: 'Abebe Bikila' },
    { key: '{closure_reason}', field: 'closure_reason', label: 'Closure Reason', description: 'Reason recorded upon resolution or closure', example: 'Inputs reallocated and collected' },
];

function resolvePlaceholders(placeholders?: PlaceholderItem[]): PlaceholderItem[] {
    return placeholders && placeholders.length > 0 ? placeholders : DEFAULT_PLACEHOLDERS;
}

function placeholderToken(placeholder: PlaceholderItem): string {
    return placeholder.key || `{${placeholder.name || placeholder.field || ''}}`;
}

function placeholderTitle(placeholder: PlaceholderItem): string {
    return `${placeholder.label}: ${placeholder.description || ''}${placeholder.example ? ` (e.g. ${placeholder.example})` : ''}`;
}

// Matches {ticket_number} but leaves Jinja syntax such as {{ x }} and {% if x %} as text.
const PLACEHOLDER_TOKEN = /((?<!\{)\{\w+\}(?!\}))/;

/** Read-only template text, with each placeholder marked up instead of printed raw. */
export function TemplateText({ value, placeholders }: { value: string; placeholders?: PlaceholderItem[] }) {
    if (!value) return <p className="text-[14px] text-gray-800">—</p>;

    const allPlaceholders = resolvePlaceholders(placeholders);

    return (
        <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">
            {value.split(PLACEHOLDER_TOKEN).map((part, index) => {
                if (index % 2 === 0) return part;
                const placeholder = allPlaceholders.find((v) => placeholderToken(v) === part);
                return (
                    <span
                        key={index}
                        className="inline-flex px-1.5 rounded-md text-[12px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        title={placeholder ? placeholderTitle(placeholder) : undefined}
                    >
                        {part}
                    </span>
                );
            })}
        </p>
    );
}

interface TemplateBodyProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholders?: PlaceholderItem[];
}

export function TemplateBody({ value, onChange, disabled = false, placeholders }: TemplateBodyProps) {
    const t = useTranslations('admin.notifications');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const allPlaceholders = resolvePlaceholders(placeholders);

    const handleInsert = (variableKey: string) => {
        if (disabled) return;
        const textarea = textareaRef.current;
        const isFocused = typeof document !== 'undefined' && document.activeElement === textarea;

        if (textarea && isFocused) {
            const start = textarea.selectionStart ?? value.length;
            const end = textarea.selectionEnd ?? value.length;
            const before = value.substring(0, start);
            const after = value.substring(end);
            const nextValue = `${before}${variableKey}${after}`;
            onChange(nextValue);

            requestAnimationFrame(() => {
                textarea.focus();
                const nextCursor = start + variableKey.length;
                textarea.setSelectionRange(nextCursor, nextCursor);
            });
        } else {
            const nextValue = value ? `${value} ${variableKey}` : variableKey;
            onChange(nextValue);
            requestAnimationFrame(() => {
                textarea?.focus();
            });
        }
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-[13px] font-medium text-gray-500">
                    {t('templateBody')}
                </label>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Tag className="w-3 h-3" />
                    <span>{t('clickToInsert')}</span>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {allPlaceholders.map((v) => {
                    const token = placeholderToken(v);
                    return (
                        <button
                            key={token}
                            type="button"
                            onClick={() => handleInsert(token)}
                            disabled={disabled}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 transition-colors disabled:opacity-50"
                            title={placeholderTitle(v)}
                        >
                            <span>{token}</span>
                        </button>
                    );
                })}
            </div>

            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 text-[14px] text-gray-700 min-h-48 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] resize-y leading-relaxed disabled:bg-gray-50 disabled:text-gray-400"
                placeholder={t('bodyPlaceholder')}
            />
        </div>
    );
}


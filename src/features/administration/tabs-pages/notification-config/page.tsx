"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Info, RefreshCw, Loader2 } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { NotificationCard } from './components/NotificationCard';
import {
    fetchNotificationPlaceholders,
    fetchNotificationTemplateOptions,
    fetchNotificationTemplates,
    updateNotificationTemplate,
    MAX_PAGE_SIZE,
} from './api/notificationTemplatesApi';
import type {
    FlatRecipientOption,
    NotificationTemplate,
    PlaceholderItem,
    UpdateNotificationTemplatePayload,
} from './components/types';

export default function NotificationConfigPage() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [placeholders, setPlaceholders] = useState<PlaceholderItem[]>([]);
    const [recipientOptions, setRecipientOptions] = useState<FlatRecipientOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [channelFilter, setChannelFilter] = useState<'All' | 'SMS' | 'Email'>('All');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled'>('All');
    const [recipientFilter, setRecipientFilter] = useState<string>('All');

    const reload = useCallback(() => {
        setIsLoading(true);
        setReloadKey((k) => k + 1);
    }, []);

    useEffect(() => {
        fetchNotificationTemplateOptions()
            .then((res) => {
                if (res?.placeholders) {
                    setPlaceholders(res.placeholders);
                }
                if (res?.recipients) {
                    setRecipientOptions(res.recipients);
                }
            })
            .catch(() => {
                // Non-blocking fallback
                fetchNotificationPlaceholders()
                    .then((res) => {
                        if (res?.placeholders) {
                            setPlaceholders(res.placeholders);
                        }
                    })
                    .catch(() => {});
            });
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        fetchNotificationTemplates(
            { page_size: MAX_PAGE_SIZE },
            { signal: controller.signal }
        )
            .then((data) => {
                setTemplates(data?.templates ?? []);
                setError(null);
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                setError(err instanceof Error && err.message ? err.message : 'Failed to load notification templates.');
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });

        return () => controller.abort();
    }, [reloadKey]);

    const handleUpdate = async (templateName: string, payload: UpdateNotificationTemplatePayload) => {
        const res = await updateNotificationTemplate(templateName, payload);
        if (res?.template) {
            setTemplates((prev) =>
                prev.map((t) => (t.name === templateName ? res.template : t))
            );
        } else {
            reload();
        }
    };

    const filteredTemplates = useMemo(() => {
        return templates.filter((tpl) => {
            // Channel filter
            if (channelFilter !== 'All' && tpl.channel !== channelFilter) {
                return false;
            }
            // Status filter
            if (statusFilter === 'Active' && !tpl.enabled) return false;
            if (statusFilter === 'Disabled' && tpl.enabled) return false;

            // Recipient filter
            if (recipientFilter !== 'All') {
                if (recipientFilter === 'Submitter') {
                    if (tpl.recipient_type !== 'Submitter') return false;
                } else if (recipientFilter === 'Assigned Officer') {
                    if (tpl.recipient_type !== 'Assigned Officer') return false;
                } else if (recipientFilter === 'department_head') {
                    if (tpl.role_level !== 'department_head' && tpl.recipient_type !== 'Department Officer') return false;
                } else {
                    if (tpl.role_level !== recipientFilter) return false;
                }
            }

            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matched =
                    tpl.name.toLowerCase().includes(term) ||
                    tpl.event.toLowerCase().includes(term) ||
                    (tpl.subject && tpl.subject.toLowerCase().includes(term)) ||
                    (tpl.body && tpl.body.toLowerCase().includes(term)) ||
                    (tpl.role_level_name && tpl.role_level_name.toLowerCase().includes(term));
                if (!matched) return false;
            }

            return true;
        });
    }, [templates, channelFilter, statusFilter, recipientFilter, searchTerm]);

    const counts = useMemo(() => {
        const total = templates.length;
        const active = templates.filter((t) => t.enabled).length;
        const sms = templates.filter((t) => t.channel === 'SMS').length;
        const email = templates.filter((t) => t.channel === 'Email').length;
        return { total, active, sms, email };
    }, [templates]);

    return (
        <div className="w-full flex flex-col h-[calc(100vh-230px)] bg-white border border-gray-200 rounded-xl overflow-hidden font-sans shadow-sm">

            {/* Top Bar: Info Banner & Metric Chips */}
            <div className="p-5 pb-4 shrink-0 border-b border-gray-200 bg-white z-10 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#F0F7FF] border border-[#D6E8FF] rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#1447E6] shrink-0" />
                        <span className="text-xs font-semibold text-[#1447E6]">
                            FSD Appendix C — Notification Matrix & Rules. Allowed variables: {'{ticket_number}'}, {'{service_category}'}, {'{grievance_type}'}, {'{assigned_dept}'}, {'{status}'}, and more.
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium self-end sm:self-auto shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full bg-white border border-blue-200 text-blue-800">
                            Total: <strong className="font-bold">{counts.total}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                            Active: <strong className="font-bold">{counts.active}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                            SMS: <strong className="font-bold">{counts.sms}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800">
                            Email: <strong className="font-bold">{counts.email}</strong>
                        </span>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by event, trigger, subject or body..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-all"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Channel selector */}
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                            {(['All', 'Email', 'SMS'] as const).map((ch) => (
                                <button
                                    key={ch}
                                    type="button"
                                    onClick={() => setChannelFilter(ch)}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${channelFilter === ch
                                        ? 'bg-white text-gray-800 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {ch === 'All' ? 'All Channels' : ch}
                                </button>
                            ))}
                        </div>

                        {/* Status selector */}
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                            {(['All', 'Active', 'Disabled'] as const).map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === st
                                        ? 'bg-white text-gray-800 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {st === 'All' ? 'All Status' : st}
                                </button>
                            ))}
                        </div>

                        {/* Recipient dropdown */}
                        <select
                            value={recipientFilter}
                            onChange={(e) => setRecipientFilter(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                        >
                            <option value="All">All Recipients</option>
                            {recipientOptions.length > 0 ? (
                                recipientOptions.map((r) => {
                                    const val =
                                        r.id === 'submitter'
                                            ? 'Submitter'
                                            : r.id === 'assigned_officer'
                                            ? 'Assigned Officer'
                                            : r.id;
                                    return (
                                        <option key={r.id} value={val}>
                                            {r.label}
                                        </option>
                                    );
                                })
                            ) : (
                                <>
                                    <option value="Submitter">Submitter</option>
                                    <option value="Assigned Officer">Assigned Officer</option>
                                    <option value="nodal_officer">Nodal Officer (L1)</option>
                                    <option value="senior_nodal_officer">Senior Nodal Officer (L2)</option>
                                    <option value="department_head">Department Head (L3)</option>
                                </>
                            )}
                        </select>

                        <button
                            type="button"
                            onClick={reload}
                            disabled={isLoading}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                            title="Refresh templates"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="p-5 flex flex-col">
                    {error && (
                        <div className="mb-4">
                            <ErrorAlert>
                                <div className="flex items-center justify-between w-full">
                                    <span>{error}</span>
                                    <button
                                        type="button"
                                        onClick={reload}
                                        className="ml-4 underline font-semibold hover:text-red-900"
                                    >
                                        Try again
                                    </button>
                                </div>
                            </ErrorAlert>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
                            <span className="text-sm font-medium text-gray-500">Loading notification templates...</span>
                        </div>
                    ) : (
                        <NotificationCard
                            notifications={filteredTemplates}
                            onUpdate={handleUpdate}
                            placeholders={placeholders}
                        />
                    )}
                </div>
            </div>

        </div>
    );
}

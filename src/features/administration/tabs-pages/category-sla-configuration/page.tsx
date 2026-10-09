"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { useGrievanceOptions } from '@/features/metadata';
import {
    createGrievanceType,
    createServiceCategory,
    fetchServiceCategories,
    MAX_PAGE_SIZE,
} from './api/taxonomyApi';
import { fetchSlaConfigurations, updateSlaConfiguration } from './api/slaSettingsApi';
import { AddCategoryModal } from './components/AddCategoryModal';
import { GlobalSlaPolicyCard } from './components/GlobalSlaPolicyCard';
import { SlaCategoryCard } from './components/SlaCategoryCard';
import type { ServiceCategoryRecord } from './components/taxonomyTypes';
import type { SlaConfiguration } from './components/slaSettingsTypes';
import { CATEGORY_COLORS, type SlaCategory } from './components/types';

/**
 * One card per category: its SLA window, auto-escalate and notify-on-breach
 * flags (GET /api/v1/sla-configurations), shared by every department that
 * serves the category. The card names those departments.
 */
function toSlaCategory(
    config: SlaConfiguration,
    colorIndex: number,
    departmentNames: string,
    maxSlaDays: number
): SlaCategory {
    return {
        id: config.name,
        category: config.service_category,
        categoryColor: CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length] ?? '',
        department: departmentNames,
        configId: config.name,
        slaDays: config.sla_days,
        autoEscalate: config.auto_escalate,
        notifyOnBreach: config.notify_on_breach,
        progressPercentage: maxSlaDays > 0 ? Math.round((config.sla_days / maxSlaDays) * 100) : 0,
    };
}

export default function CategorySlaConfigurationPage() {
    const t = useTranslations('admin.taxonomy');
    // A Review Officer can read this tab, but the service refuses every write for that role, so the
    // controls are hidden rather than left to fail with a 403 — the same `canManage` pattern as
    // Response Templates. UX only; the service is the enforcement boundary.
    const canManage = !useIsReviewOfficer();
    const [categories, setCategories] = useState<ServiceCategoryRecord[]>([]);
    const [configs, setConfigs] = useState<SlaConfiguration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [isAdding, setIsAdding] = useState(false);
    // Said after a category is added: it has no SLA window yet, so no card shows for it.
    const [notice, setNotice] = useState<string | null>(null);
    const { data: grievanceOptions } = useGrievanceOptions();

    const reload = useCallback(() => setReloadKey((key) => key + 1), []);

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            fetchServiceCategories({ page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
            fetchSlaConfigurations({ page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
        ])
            .then(([categoryData, configData]) => {
                setCategories(categoryData?.service_categories ?? []);
                setConfigs(configData?.sla_configurations ?? []);
                setError(null);
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                setError(err instanceof Error && err.message ? err.message : t('loadFailed'));
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });
        return () => controller.abort();
    }, [reloadKey, t]);

    const cards = useMemo(() => {
        const departments = new Map((grievanceOptions?.departments ?? []).map((d) => [d.department_id, d.department_name]));
        const colorOf = (name: string) => Math.max(0, categories.findIndex((c) => c.category_name === name));
        const maxSlaDays = Math.max(0, ...configs.map((c) => c.sla_days));
        return configs.map((config) =>
            toSlaCategory(
                config,
                colorOf(config.service_category),
                config.departments.map((id) => departments.get(id) ?? id).join(', ') || t('noDepartment'),
                maxSlaDays
            )
        );
    }, [categories, configs, grievanceOptions, t]);

    const handleSaveSla = async (
        configId: string,
        values: { sla_days: number; auto_escalate: boolean; notify_on_breach: boolean }
    ) => {
        await updateSlaConfiguration(configId, values);
        reload();
    };

    return (
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm h-[calc(100vh-230px)] flex flex-col overflow-hidden">
            {/* Top Header Section */}
            <div className="flex-none flex items-start justify-between gap-4 pt-6 pb-4 px-6 mb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Per-Category SLA Windows</h2>
                    <p className="text-sm text-gray-500">
                        Edit the SLA deadline and escalation behaviour for each service category.
                    </p>
                </div>
                {canManage && (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="shrink-0 px-4 py-2.5 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803d] transition-colors"
                    >
                        {t('addCategoryButton')}
                    </button>
                )}
            </div>

            {/* Scrollable Content (Global Policy + Categories) */}
            <div className="flex-1 overflow-y-auto p-6 pt-2 flex flex-col [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">

                <GlobalSlaPolicyCard canManage={canManage} />

                {notice && (
                    <div
                        role="status"
                        className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#B7ECC9] bg-[#E1F9E8] p-4 text-sm font-medium text-[#1A9F53]"
                    >
                        <span>{notice}</span>
                        <button type="button" onClick={() => setNotice(null)} className="shrink-0 underline font-semibold">
                            {t('dismiss')}
                        </button>
                    </div>
                )}

                {isLoading ? (
                    <p className="text-sm text-gray-500" role="status">{t('loading')}</p>
                ) : error ? (
                    <ErrorAlert>
                        {error}{' '}
                        <button type="button" onClick={reload} className="underline font-semibold">{t('retry')}</button>
                    </ErrorAlert>
                ) : cards.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('empty')}</p>
                ) : (
                    <div className="flex flex-col">
                        {cards.map((card) => (
                            <SlaCategoryCard key={card.id} categoryData={card} onSaveSla={canManage ? handleSaveSla : undefined} />
                        ))}
                    </div>
                )}

            </div>

            {canManage && isAdding && (
                <AddCategoryModal
                    takenCodes={categories.map((c) => c.code)}
                    onCreate={async (payload, firstType) => {
                        await createServiceCategory(payload);
                        reload();
                        try {
                            await createGrievanceType({ service_category: payload.category_name, type_name: firstType });
                            setNotice(t('categoryCreatedNotice', { name: payload.category_name }));
                        } catch (err) {
                            // The category exists now, so a retry of this form would hit a duplicate.
                            throw new Error(
                                t('categoryCreatedTypeFailed', {
                                    reason: err instanceof Error && err.message ? err.message : t('saveFailed'),
                                })
                            );
                        }
                    }}
                    onClose={() => setIsAdding(false)}
                />
            )}
        </div>
    );
}

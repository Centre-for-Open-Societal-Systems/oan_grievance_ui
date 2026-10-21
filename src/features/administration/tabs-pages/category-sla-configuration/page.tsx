"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { useGrievanceOptions } from '@/features/metadata';
import {
    createGrievanceType,
    createServiceCategory,
    deactivateGrievanceType,
    deactivateServiceCategory,
    fetchGrievanceTypes,
    fetchServiceCategories,
    MAX_PAGE_SIZE,
    updateServiceCategory,
} from './api/taxonomyApi';
import { fetchSlaConfigurations, updateSlaConfiguration } from './api/slaSettingsApi';
import { AddCategoryModal } from './components/AddCategoryModal';
import { GlobalSlaPolicyCard } from './components/GlobalSlaPolicyCard';
import { SlaCategoryCard } from './components/SlaCategoryCard';
import { slaBarPercent, slaBarReferenceDays } from './components/slaBar';
import type { GrievanceTypeRecord, ServiceCategoryRecord } from './components/taxonomyTypes';
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
    barReferenceDays: number
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
        progressPercentage: slaBarPercent(config.sla_days, barReferenceDays),
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
    const [grievanceTypes, setGrievanceTypes] = useState<GrievanceTypeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [isAdding, setIsAdding] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const { data: grievanceOptions } = useGrievanceOptions();
    // The Global SLA Policy's "Max SLA Deferral (days)": each category bar shows its SLA against it.
    // Until it loads (or if it can't) the bars use a 30-day scale.
    const [globalSlaDays, setGlobalSlaDays] = useState<number | null>(null);
    const barReferenceDays = slaBarReferenceDays(globalSlaDays);

    const reload = useCallback(() => setReloadKey((key) => key + 1), []);

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            fetchServiceCategories({ page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
            fetchSlaConfigurations({ page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
            fetchGrievanceTypes({ is_active: true, page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
        ])
            .then(([categoryData, configData, typeData]) => {
                setCategories(categoryData?.service_categories ?? []);
                setConfigs(configData?.sla_configurations ?? []);
                setGrievanceTypes(typeData?.grievance_types ?? []);
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
        // A config's category missing from `categories` (a stale fetch race, or a category
        // beyond the page_size cap) used to collapse to the same color as "found at index 0"
        // (`Math.max(0, -1)` is 0 either way) — falls back to a hash of the name instead, so a
        // genuine index-0 match and a true miss don't silently look identical.
        const colorOf = (name: string) => {
            const index = categories.findIndex((c) => c.category_name === name);
            if (index >= 0) return index;
            let hash = 0;
            for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
            return Math.abs(hash);
        };
        // A deactivated category keeps its SLA configuration; it just leaves this list.
        const inactive = new Set(categories.filter((c) => !c.is_active).map((c) => c.category_name));
        return configs.filter((config) => !inactive.has(config.service_category)).map((config) =>
            toSlaCategory(
                config,
                colorOf(config.service_category),
                config.departments.map((id) => departments.get(id) ?? id).join(', '),
                barReferenceDays
            )
        );
    }, [categories, configs, grievanceOptions, barReferenceDays]);

    const typesByCategory = useMemo(() => {
        const grouped = new Map<string, GrievanceTypeRecord[]>();
        for (const type of grievanceTypes) {
            grouped.set(type.service_category, [...(grouped.get(type.service_category) ?? []), type]);
        }
        return grouped;
    }, [grievanceTypes]);

    const defaultCategory = categories.find((c) => c.is_default)?.category_name;

    const handleAddType = async (category: string, typeName: string) => {
        await createGrievanceType({ service_category: category, type_name: typeName });
        reload();
    };

    const handleDeactivateType = async (grievanceTypeId: string) => {
        await deactivateGrievanceType(grievanceTypeId);
        reload();
    };

    const handleDeactivateCategory = async (category: string) => {
        await deactivateServiceCategory(category);
        setNotice(t('categoryDeactivatedNotice', { name: category }));
        reload();
    };

    const handleRenameCategory = async (category: string, newName: string) => {
        await updateServiceCategory(category, { category_name: newName });
        reload();
    };

    const handleSaveSla = async (
        configId: string,
        values: { sla_days: number; auto_escalate: boolean; notify_on_breach: boolean }
    ) => {
        await updateSlaConfiguration(configId, values);
        reload();
    };

    return (
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm h-[calc(100vh-230px)] flex flex-col overflow-hidden">
            {/* Scrollable Content (Global Policy + Per-Category) */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">

                {/* Section 1: Global SLA Policy — GlobalSlaPolicyCard carries its own heading. */}
                <GlobalSlaPolicyCard canManage={canManage} onMaxDeferralDaysChange={setGlobalSlaDays} />

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

                {/* Section 2: Per-Category SLA Windows — its own heading, with Add Category here rather than at the page's top. */}
                <div className="flex items-start justify-between gap-4 pt-2 pb-4 mb-4 border-b border-gray-200">
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
                            <SlaCategoryCard
                                key={card.id}
                                categoryData={card}
                                onSaveSla={canManage ? handleSaveSla : undefined}
                                grievanceTypes={typesByCategory.get(card.category) ?? []}
                                isDefaultCategory={card.category === defaultCategory}
                                onAddType={canManage ? (name) => handleAddType(card.category, name) : undefined}
                                onDeactivateType={canManage ? handleDeactivateType : undefined}
                                onDeactivateCategory={canManage ? () => handleDeactivateCategory(card.category) : undefined}
                                onRenameCategory={canManage ? (name) => handleRenameCategory(card.category, name) : undefined}
                                renamingTo={categories.find((c) => c.category_name === card.category)?.renaming_to ?? null}
                            />
                        ))}
                    </div>
                )}

            </div>

            {canManage && isAdding && (
                <AddCategoryModal
                    takenCodes={categories.map((c) => c.code)}
                    departments={grievanceOptions?.departments ?? []}
                    onCreate={async (payload) => {
                        await createServiceCategory(payload);
                        setNotice(t('categoryCreatedNotice', { name: payload.category_name }));
                        reload();
                    }}
                    onClose={() => setIsAdding(false)}
                />
            )}
        </div>
    );
}

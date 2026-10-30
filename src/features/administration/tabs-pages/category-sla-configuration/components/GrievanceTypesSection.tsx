"use client";

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { z } from 'zod';
import { describeSaveError } from './apiErrorMessage';
import type { GrievanceTypeRecord } from './taxonomyTypes';

interface GrievanceTypesSectionProps {
    types: GrievanceTypeRecord[];
    /** Absent when the viewer can't change the taxonomy (a Review Officer): the list is read-only. */
    onAddType?: (typeName: string) => Promise<void>;
    onDeactivateType?: (grievanceTypeId: string) => Promise<void>;
}

/**
 * A category's active grievance types, with add and deactivate. Deactivating
 * is the service's DELETE: the type stops being offered for new grievances,
 * while the ones already filed under it keep it.
 */
export function GrievanceTypesSection({ types, onAddType, onDeactivateType }: GrievanceTypesSectionProps) {
    const t = useTranslations('admin.taxonomy');
    const inputId = useId();
    const [newType, setNewType] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canManage = !!onAddType && !!onDeactivateType;

    const describe = (err: unknown) =>
        describeSaveError(err, {
            auth: t('authError'),
            forbidden: t('forbiddenError'),
            connection: t('connectionError'),
            fallback: t('saveFailed'),
        });

    const handleAdd = async () => {
        if (!onAddType) return;
        const parsed = z
            .string()
            .trim()
            .min(1, t('typeRequired'))
            .max(140, t('nameTooLong'))
            .safeParse(newType);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? t('typeRequired'));
            return;
        }
        setIsAdding(true);
        setError(null);
        try {
            await onAddType(parsed.data);
            setNewType('');
        } catch (err) {
            setError(describe(err));
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!onDeactivateType) return;
        setBusyId(id);
        setError(null);
        try {
            await onDeactivateType(id);
            setConfirmingId(null);
        } catch (err) {
            setError(describe(err));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section aria-labelledby={`${inputId}-heading`} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h4 id={`${inputId}-heading`} className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-4">
                {t('grievanceTypesHeading')}
            </h4>

            {types.length === 0 ? (
                <p className="text-sm text-gray-500 mb-4">{t('noGrievanceTypes')}</p>
            ) : (
                <ul className="flex flex-col divide-y divide-gray-100 mb-4">
                    {types.map((type) => (
                        <li key={type.grievance_type_id} className="flex items-center justify-between gap-3 py-2">
                            <span className="text-sm text-gray-800">{type.type_name}</span>
                            {canManage &&
                                (confirmingId === type.grievance_type_id ? (
                                    <span className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{t('deactivateTypeConfirm')}</span>
                                        <button
                                            type="button"
                                            disabled={busyId === type.grievance_type_id}
                                            onClick={() => void handleDeactivate(type.grievance_type_id)}
                                            className="px-3 py-1 text-xs font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {t('deactivate')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmingId(null)}
                                            className="px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
                                        >
                                            {t('cancel')}
                                        </button>
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        aria-label={t('deactivateTypeLabel', { name: type.type_name })}
                                        onClick={() => setConfirmingId(type.grievance_type_id)}
                                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                ))}
                        </li>
                    ))}
                </ul>
            )}

            {canManage && (
                <div className="flex flex-col gap-2">
                    <label htmlFor={inputId} className="text-sm font-medium text-gray-800">
                        {t('addGrievanceTypeLabel')}
                    </label>
                    <div className="flex gap-2">
                        <input
                            id={inputId}
                            type="text"
                            value={newType}
                            maxLength={140}
                            onChange={(e) => setNewType(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleAdd();
                                }
                            }}
                            placeholder={t('grievanceTypePlaceholder')}
                            className="flex-1 bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                        />
                        <button
                            type="button"
                            disabled={isAdding}
                            onClick={() => void handleAdd()}
                            className="px-4 py-2 text-sm font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#10883c] flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            {t('addType')}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <p role="alert" className="mt-3 text-xs font-medium text-red-600">
                    {error}
                </p>
            )}
        </section>
    );
}

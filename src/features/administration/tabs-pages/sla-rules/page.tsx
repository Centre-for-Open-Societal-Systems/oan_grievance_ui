"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { fetchApi } from '@/lib/api';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { fetchGrievanceTypes, fetchServiceCategories } from '../category-sla-configuration/api/taxonomyApi';
import type { GrievanceTypeRecord, ServiceCategoryRecord } from '../category-sla-configuration/components/taxonomyTypes';
import { createSlaRule, deleteSlaRuleCluster, fetchSlaRuleClusters, MAX_PAGE_SIZE, updateSlaRuleCluster } from './api/slaRulesApi';
import { SlaRuleFormModal } from './components/SlaRuleFormModal';
import type { Pagination, SlaRule, SlaRuleCluster, UpdateSlaRuleClusterPayload } from './components/types';

const PAGE_SIZE = 20;

interface RoleLevelRecord {
  level_code: string;
  level_name: string;
}

/**
 * `null` = form closed, `'new'` = adding, a cluster = editing it. The form adds a rule per type
 * picked, so the list shows and edits those rules together; the service does the grouping.
 */
type FormState = null | 'new' | SlaRuleCluster;

/** "10/1 to 4/30", or "All year" when the rule has no window. */
function windowText(rule: SlaRule, allYear: string): string {
  if (rule.start_month == null) return allYear;
  return `${rule.start_month}/${rule.start_day} – ${rule.end_month}/${rule.end_day}`;
}

export default function SlaRulesPage() {
  const t = useTranslations('admin.slaRules');
  // A Review Officer can read this tab but the service refuses every write for that role.
  const canManage = !useIsReviewOfficer();
  const [categories, setCategories] = useState<ServiceCategoryRecord[]>([]);
  const [types, setTypes] = useState<GrievanceTypeRecord[]>([]);
  const [roleLevels, setRoleLevels] = useState<RoleLevelRecord[]>([]);
  const [clusters, setClusters] = useState<SlaRuleCluster[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<FormState>(null);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // The lookups the filter and the form need, once.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchServiceCategories({ is_active: true, page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
      fetchGrievanceTypes({ is_active: true, page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
      fetchApi<{ role_levels: RoleLevelRecord[] }>('/api/v1/role-levels?is_active=true', {
        method: 'GET',
        signal: controller.signal,
      }),
    ])
      .then(([categoryData, typeData, levelData]) => {
        setCategories(categoryData?.service_categories ?? []);
        setTypes(typeData?.grievance_types ?? []);
        setRoleLevels(levelData?.role_levels ?? []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err instanceof Error && err.message ? err.message : t('loadFailed'));
      });
    return () => controller.abort();
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSlaRuleClusters(
      { page, page_size: PAGE_SIZE, service_category: selectedCategory || undefined },
      { signal: controller.signal }
    )
      .then((data) => {
        const pages = data?.pagination?.total_pages ?? 1;
        // A delete emptied the last page: show the one that is now last.
        if (page > pages) {
          setPage(pages);
          return;
        }
        setClusters(data?.clusters ?? []);
        setPagination(data?.pagination ?? null);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error && err.message ? err.message : t('loadFailed'));
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [selectedCategory, page, reloadKey, t]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.category_name, label: c.category_name })),
    [categories]
  );
  const levelOptions = useMemo(() => roleLevels.map((l) => ({ value: l.level_code, label: l.level_name })), [roleLevels]);
  const typeOptions = useMemo(
    () => types.map((type) => ({ value: type.grievance_type_id, label: type.type_name, serviceCategory: type.service_category })),
    [types]
  );
  const typeNames = useMemo(() => new Map(types.map((type) => [type.grievance_type_id, type.type_name])), [types]);
  const levelNames = useMemo(() => new Map(roleLevels.map((l) => [l.level_code, l.level_name])), [roleLevels]);

  const handleDelete = async (cluster: SlaRuleCluster) => {
    setActionError(null);
    try {
      await deleteSlaRuleCluster(cluster.cluster_id);
      setConfirmDelete(null);
      reload();
    } catch (err) {
      setConfirmDelete(null);
      setActionError(err instanceof Error && err.message ? err.message : t('deleteFailed'));
      reload();
    }
  };

  /** One request: the service changes the whole cluster, or nothing when any rule is refused. */
  const handleUpdate = async (cluster: SlaRule[], payload: UpdateSlaRuleClusterPayload) => {
    const first = cluster[0];
    if (!first) return;
    try {
      await updateSlaRuleCluster(first.name, payload);
    } finally {
      reload();
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('heading')}</h2>
            <p className="text-sm text-gray-500">{t('description')}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              aria-label={t('filterByCategory')}
              value={selectedCategory}
              onChange={(e) => {
                setIsLoading(true);
                setPage(1);
                setSelectedCategory(e.target.value);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900"
            >
              <option value="">{t('allCategories')}</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {canManage && (
              <button
                type="button"
                onClick={() => setForm('new')}
                className="shrink-0 px-4 py-2.5 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803d] transition-colors"
              >
                {t('addRule')}
              </button>
            )}
          </div>
        </div>

        {actionError && <ErrorAlert>{actionError}</ErrorAlert>}

        {isLoading ? (
          <p className="text-sm text-gray-500" role="status">{t('loading')}</p>
        ) : error ? (
          <ErrorAlert>
            {error}{' '}
            <button type="button" onClick={reload} className="underline font-semibold">{t('retry')}</button>
          </ErrorAlert>
        ) : clusters.length === 0 ? (
          <p className="text-sm text-gray-500">{t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-2 pr-4">{t('serviceCategory')}</th>
                  <th className="py-2 pr-4">{t('ruleLabel')}</th>
                  <th className="py-2 pr-4">{t('roleLevel')}</th>
                  <th className="py-2 pr-4">{t('grievanceType')}</th>
                  <th className="py-2 pr-4">{t('administrativeArea')}</th>
                  <th className="py-2 pr-4">{t('window')}</th>
                  <th className="py-2 pr-4">{t('slaDays')}</th>
                  <th className="py-2 pr-4">{t('urgent')}</th>
                  {canManage && <th className="py-2" />}
                </tr>
              </thead>
              <tbody>
                {clusters.map((cluster) => {
                  const rule = cluster.rules[0];
                  const id = cluster.cluster_id;
                  return (
                  <tr key={id} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-4 font-medium text-gray-900">{rule.service_category}</td>
                    <td className="py-3 pr-4 text-gray-700">
                      {rule.rule_label ?? '—'}
                      {rule.is_base && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">{t('base')}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{rule.role_level ? (levelNames.get(rule.role_level) ?? rule.role_level) : t('wholeCase')}</td>
                    <td className="py-3 pr-4 text-gray-700">{rule.grievance_type ? (
                      <div className="flex flex-wrap gap-1.5">
                        {cluster.rules.map((member) => (
                          <span key={member.name} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            {typeNames.get(member.grievance_type ?? '') ?? member.grievance_type}
                          </span>
                        ))}
                      </div>
                    ) : t('everyType')}</td>
                    <td className="py-3 pr-4 text-gray-700">{rule.administrative_area ? (rule.administrative_area_name ?? rule.administrative_area) : t('everywhere')}</td>
                    <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">{windowText(rule, t('allYear'))}</td>
                    <td className="py-3 pr-4 font-semibold text-gray-900">{rule.sla_days}</td>
                    <td className="py-3 pr-4 text-gray-700">{rule.is_urgent ? t('yes') : t('no')}</td>
                    {canManage && (
                      <td className="py-3 whitespace-nowrap text-right">
                        <button type="button" aria-label={t('edit')} onClick={() => setForm(cluster)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!rule.is_base &&
                          (confirmDelete === id ? (
                            <span className="inline-flex items-center gap-2 ml-2">
                              <button type="button" onClick={() => void handleDelete(cluster)} className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">
                                {t('delete')}
                              </button>
                              <button type="button" onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                                {t('cancel')}
                              </button>
                            </span>
                          ) : (
                            <button type="button" aria-label={t('delete')} onClick={() => setConfirmDelete(id)} className="p-2 rounded-full text-red-500 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ))}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm text-gray-600">
            <span>{t('pageOf', { page: pagination.page, pages: pagination.total_pages, total: pagination.total_count })}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.has_prev}
                onClick={() => { setIsLoading(true); setPage((p) => p - 1); }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                {t('previous')}
              </button>
              <button
                type="button"
                disabled={!pagination.has_next}
                onClick={() => { setIsLoading(true); setPage((p) => p + 1); }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {canManage && form && (
        <SlaRuleFormModal
          rules={form === 'new' ? null : form.rules}
          defaultCategory={selectedCategory}
          serviceCategories={categoryOptions}
          roleLevels={levelOptions}
          grievanceTypes={typeOptions}
          onCreate={async (payload) => {
            await createSlaRule(payload);
            reload();
          }}
          onUpdate={handleUpdate}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { fetchGrievanceOptionsThunk, selectCategoryFilterOptions, useAreas } from '@/features/metadata';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { OFFICER_TAB_QUERY, OFFICER_TABS, OFFICER_TABS_BY_ID, REVIEWER_STATUS_OPTIONS, type Officer, type OfficerTabId } from '../data/officers';
import { useOfficerCount } from '../hooks/useOfficerCount';
import { useOfficerList } from '../hooks/useOfficerList';
import { useOfficerStatusCounts } from '../hooks/useOfficerStatusCounts';
import { AddNodalOfficerModal } from './AddNodalOfficerModal';
import { EditNodalOfficerModal } from './EditNodalOfficerModal';
import { OfficerCard } from './OfficerCard';
import { OfficerFiltersDrawer } from './OfficerFiltersDrawer';
import { OfficerPagination } from './OfficerPagination';
import { OfficerStatsBar } from './OfficerStatsBar';
import { OfficerTabs } from './OfficerTabs';
import { OfficerToolbar } from './OfficerToolbar';

const PAGE_SIZE = 9;

export function OfficerDirectory() {
  const dispatch = useAppDispatch();
  // A Review Officer can read the Admin/Nodal tabs here (route access — see rbac.ts), but
  // the backend refuses to even list Reviewer accounts for that role (STG-443's
  // `REVIEWER_READ_ROLES` is an admin-only set) — see this file's `visibleTabs` below — and
  // refuses every create/edit/password-reset call regardless of tab, so those controls are
  // hidden rather than left to fail with a 403 on click.
  const canManage = !useIsReviewOfficer();

  const visibleTabs = useMemo(() => (canManage ? OFFICER_TABS : OFFICER_TABS.filter((tab) => tab.id !== 'reviewer')), [canManage]);

  const [activeTab, setActiveTab] = useState<OfficerTabId>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);

  const activeTabConfig = OFFICER_TABS_BY_ID[activeTab];
  const { role, level } = OFFICER_TAB_QUERY[activeTab];
  const isReviewerTab = role === 'Reviewer';

  // Metadata (department/service-category/region options) backs both this page's filters
  // and the Add/Edit officer forms.
  const grievanceOptionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  useEffect(() => {
    if (grievanceOptionsStatus === 'idle') {
      void dispatch(fetchGrievanceOptionsThunk());
    }
  }, [dispatch, grievanceOptionsStatus]);
  const categoryOptions = useAppSelector(selectCategoryFilterOptions);
  const { areas: regionAreas } = useAreas({ level: 'Region' });

  const apiResult = useOfficerList({
    role,
    level,
    search: searchQuery,
    category: categoryFilter,
    region: regionFilter,
    status: statusFilter,
    page,
    enabled: true,
  });

  // Independent of which tab is active — a tab's `(N)` badge needs its real total even
  // before you've ever clicked into it, which `apiResult` alone can't provide (it only
  // fetches for the currently active tab).
  const adminCount = useOfficerCount('Officer', 'L3');
  const l1Count = useOfficerCount('Officer', 'L1');
  const l2Count = useOfficerCount('Officer', 'L2');
  const reviewerCount = useOfficerCount('Reviewer', undefined, canManage);

  // The real tabs filter by the backend's stored region id, not its display name — sending
  // the name would silently match nothing, since officers are stored with the id.
  const availableRegions = [...regionAreas].sort((a, b) => a.area_name.localeCompare(b.area_name)).map((area) => ({ value: area.area_id, label: area.area_name }));
  const availableCategories = categoryOptions.map((o) => o.label).sort();

  const displayedOfficers = apiResult.officers;
  const currentPage = page;
  const totalPages = apiResult.totalPages;
  const totalCount = apiResult.totalCount;

  const apiStatusCounts = useOfficerStatusCounts(role, level, true);
  const stats = { active: apiStatusCounts.active, onLeave: apiStatusCounts.onLeave, inactive: apiStatusCounts.inactive };

  const activeFilterCount = [categoryFilter, regionFilter, statusFilter].filter(Boolean).length;

  const resetFilters = () => {
    setCategoryFilter('');
    setRegionFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const handleTabChange = (tab: OfficerTabId) => {
    setActiveTab(tab);
    setSearchQuery('');
    resetFilters();
    setIsFiltersOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <div className="bg-white rounded-xl p-6 border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{activeTabConfig.label}</h1>
          <p className="text-gray-500 text-sm mt-1">{activeTabConfig.description}</p>
        </div>

        <OfficerTabs
          tabs={visibleTabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          counts={{
            admin: activeTab === 'admin' && !apiResult.isLoading ? totalCount : adminCount,
            'nodal-l1': activeTab === 'nodal-l1' && !apiResult.isLoading ? totalCount : l1Count,
            'nodal-l2': activeTab === 'nodal-l2' && !apiResult.isLoading ? totalCount : l2Count,
            reviewer: activeTab === 'reviewer' && !apiResult.isLoading ? totalCount : reviewerCount,
          }}
        />

        <OfficerToolbar
          searchQuery={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          addButtonLabel={activeTabConfig.addButtonLabel}
          onAddClick={() => setIsAddOpen(true)}
          onOpenFilters={() => setIsFiltersOpen(true)}
          activeFilterCount={activeFilterCount}
          canManage={canManage}
        />

        <OfficerStatsBar active={stats.active} onLeave={stats.onLeave} inactive={stats.inactive} />
      </div>

      {apiResult.error ? (
        <div className="bg-white rounded-xl border border-red-200 p-12 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-red-600 max-w-md">{apiResult.error}</p>
          <button
            type="button"
            onClick={apiResult.refetch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      ) : apiResult.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#F1F3F4] p-5 h-64 animate-pulse" />
          ))}
        </div>
      ) : displayedOfficers.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#F1F3F4] p-12 flex items-center justify-center text-sm text-gray-500">
          No {activeTabConfig.listLabel.toLowerCase()} match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedOfficers.map((officer) => (
            <OfficerCard key={officer.id} officer={officer} onEdit={setEditingOfficer} canEdit={canManage} />
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#F1F3F4] px-5 py-4">
        <OfficerPagination
          page={currentPage}
          totalPages={totalPages}
          pageCount={displayedOfficers.length}
          totalCount={totalCount}
          listLabel={activeTabConfig.listLabel}
          onPageChange={(next) => setPage(Math.min(Math.max(1, next), totalPages))}
        />
      </div>

      <AddNodalOfficerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        role={role}
        level={level}
        tabLabel={activeTabConfig.label}
        onCreated={apiResult.refetch}
      />
      <EditNodalOfficerModal
        key={editingOfficer?.id ?? 'closed'}
        isOpen={editingOfficer !== null}
        onClose={() => setEditingOfficer(null)}
        officer={editingOfficer}
        role={role}
        level={level}
        onSaved={apiResult.refetch}
      />

      <OfficerFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={(value) => {
          setCategoryFilter(value);
          setPage(1);
        }}
        availableCategories={availableCategories}
        regionFilter={regionFilter}
        onRegionFilterChange={(value) => {
          setRegionFilter(value);
          setPage(1);
        }}
        availableRegions={availableRegions}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        statusOptions={isReviewerTab ? REVIEWER_STATUS_OPTIONS : undefined}
        onReset={resetFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchGrievanceOptionsThunk,
  fetchRegionsThunk,
  selectCategoryFilterOptions,
  selectStatusFilterOptions,
} from '@/features/metadata';
import { TopHeader } from './components/TopHeader';
import { MetricCardsComponent } from './components/MetricCardsComponent';
import { GrievanceTable } from './components/GrievanceTable';
import { AdvancedFiltersSidebar } from './components/AdvancedFiltersSidebar';
import { GrievanceDetailSidebar } from './detail-sidebar-panel/page';
import { useGrievanceList } from './hooks/useGrievanceList';
import { useGrievanceMetrics } from './hooks/useGrievanceMetrics';
import { EMPTY_GRIEVANCE_FILTERS, type Grievance, type GrievanceFilters } from './types';

export default function AllGrievancesPage() {
  const dispatch = useAppDispatch();
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<GrievanceFilters>({ ...EMPTY_GRIEVANCE_FILTERS });

  // Reference data for the filter dropdowns comes from GET /api/v1/grievances/options
  // (statuses, categories) and GET /api/v1/administrative-areas (regions).
  const optionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  const regionsStatus = useAppSelector((state) => state.metadata.regionsStatus);
  const statusOptions = useAppSelector(selectStatusFilterOptions);
  const categoryOptions = useAppSelector(selectCategoryFilterOptions);

  useEffect(() => {
    if (optionsStatus === 'idle') void dispatch(fetchGrievanceOptionsThunk());
    if (regionsStatus === 'idle') void dispatch(fetchRegionsThunk());
  }, [dispatch, optionsStatus, regionsStatus]);

  const { grievances, totalItems, totalPages, isLoading, error, refetch } = useGrievanceList({
    filters,
    search: searchTerm,
    page: currentPage,
    pageSize: rowsPerPage,
  });

  const allStatusValues = useMemo(() => statusOptions.map((s) => s.value), [statusOptions]);
  const { metrics } = useGrievanceMetrics(allStatusValues);

  // Reset to the first page whenever the query changes, so pagination can't point past
  // the end of a narrowed result set. Adjusted during render (React's documented pattern
  // for "reset this state when that one changes") rather than in an effect.
  const [prevQueryState, setPrevQueryState] = useState({ searchTerm, filters });
  if (prevQueryState.searchTerm !== searchTerm || prevQueryState.filters !== filters) {
    setPrevQueryState({ searchTerm, filters });
    setCurrentPage(1);
  }

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({ ...EMPTY_GRIEVANCE_FILTERS });
  };

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <TopHeader totalCount={metrics.all} />
      <MetricCardsComponent metrics={metrics} />
      <GrievanceTable
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        totalItems={totalItems}
        totalPages={totalPages}
        grievances={grievances}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onOpenAdvancedFilters={() => setIsAdvancedFiltersOpen(true)}
        statusOptions={statusOptions}
        categoryOptions={categoryOptions}
        selectedStatuses={filters.status}
        setSelectedStatuses={(status) => setFilters((f) => ({ ...f, status }))}
        selectedCategories={filters.category}
        setSelectedCategories={(category) => setFilters((f) => ({ ...f, category }))}
        onClearFilters={handleClearFilters}
        onViewGrievance={setSelectedGrievance}
      />

      <AdvancedFiltersSidebar
        isOpen={isAdvancedFiltersOpen}
        onClose={() => setIsAdvancedFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />

      <GrievanceDetailSidebar
        grievance={selectedGrievance}
        onClose={() => setSelectedGrievance(null)}
      />
    </div>
  );
}

"use client";

import React, { useState, useMemo } from 'react';
import { mockGrievances } from './mockData';
import { TopHeader } from './components/TopHeader';
import { MetricCardsComponent } from './components/MetricCardsComponent';
import { GrievanceTable, FILTER_OPTIONS } from './components/GrievanceTable';
import { AdvancedFiltersSidebar } from './components/AdvancedFiltersSidebar';
import { GrievanceDetailSidebar } from './detail-sidebar-panel/page';
import { Grievance } from './mockData';

export default function AllGrievancesPage() {
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [advancedFilters, setAdvancedFilters] = useState({
    status: [] as string[],
    category: [] as string[],
    priority: [] as string[],
    regions: [] as string[],
    dateRange: null as string | null
  });

  const [tableFilters, setTableFilters] = useState({
    category: [...FILTER_OPTIONS.category],
    status: [...FILTER_OPTIONS.status],
    priority: [...FILTER_OPTIONS.priority]
  });

  // Filtering
  const filteredGrievances = useMemo(() => {
    return mockGrievances.filter((g) => {
      // 1. Search term match
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || (
        g.ticketId.toLowerCase().includes(searchLower) ||
        g.title.toLowerCase().includes(searchLower) ||
        g.location.toLowerCase().includes(searchLower) ||
        g.type.toLowerCase().includes(searchLower) ||
        g.category.toLowerCase().includes(searchLower) ||
        g.status.toLowerCase().includes(searchLower)
      );

      // 2. Advanced filters match
      const matchesStatus = advancedFilters.status.length === 0 || advancedFilters.status.includes(g.status);
      const matchesCategory = advancedFilters.category.length === 0 || advancedFilters.category.includes(g.category) || advancedFilters.category.includes(g.type);
      const matchesPriority = advancedFilters.priority.length === 0 || advancedFilters.priority.includes(g.priority);
      const matchesRegion = advancedFilters.regions.length === 0 || advancedFilters.regions.some(r => g.location.includes(r));
      
      // 3. Date match
      let matchesDate = true;
      const filters = advancedFilters as any;
      if (filters.fromDate || filters.toDate) {
        const itemDate = new Date(g.submittedAt);
        if (filters.fromDate) {
          const from = new Date(filters.fromDate);
          from.setHours(0, 0, 0, 0);
          if (itemDate < from) matchesDate = false;
        }
        if (filters.toDate) {
          const to = new Date(filters.toDate);
          to.setHours(23, 59, 59, 999);
          if (itemDate > to) matchesDate = false;
        }
      }
      
      // 4. Table filters match
      const matchesTableCategory = tableFilters.category.length === FILTER_OPTIONS.category.length || tableFilters.category.includes(g.category) || tableFilters.category.includes(g.type as any);
      const matchesTableStatus = tableFilters.status.length === FILTER_OPTIONS.status.length || tableFilters.status.includes(g.status);
      const matchesTablePriority = tableFilters.priority.length === FILTER_OPTIONS.priority.length || tableFilters.priority.includes(g.priority);

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesRegion && matchesDate && matchesTableCategory && matchesTableStatus && matchesTablePriority;
    });
  }, [searchTerm, advancedFilters, tableFilters]);

  // Pagination
  const totalItems = filteredGrievances.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  const paginatedGrievances = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredGrievances.slice(start, start + rowsPerPage);
  }, [filteredGrievances, currentPage, rowsPerPage]);

  // Metrics
  const metrics = useMemo(() => {
    return {
      all: mockGrievances.length,
      pending: mockGrievances.filter(g => g.status === 'Pending Submit' || g.status === 'Submitted').length,
      inProgress: mockGrievances.filter(g => g.status === 'In Progress' || g.status === 'Assigned').length,
      underReview: mockGrievances.filter(g => g.status === 'Under Review' || g.status === 'More Info Needed').length,
      resolved: mockGrievances.filter(g => g.status === 'Resolved').length,
      rejected: mockGrievances.filter(g => g.status === 'Rejected').length,
    };
  }, []);

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
        paginatedGrievances={paginatedGrievances}
        onOpenAdvancedFilters={() => setIsAdvancedFiltersOpen(true)}
        selectedFilters={tableFilters}
        setSelectedFilters={setTableFilters}
        onViewGrievance={setSelectedGrievance}
      />

      <AdvancedFiltersSidebar 
        isOpen={isAdvancedFiltersOpen} 
        onClose={() => setIsAdvancedFiltersOpen(false)} 
        filters={advancedFilters}
        setFilters={setAdvancedFilters}
      />

      <GrievanceDetailSidebar
        grievance={selectedGrievance}
        onClose={() => setSelectedGrievance(null)}
      />
    </div>
  );
}

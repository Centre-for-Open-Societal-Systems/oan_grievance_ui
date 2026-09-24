'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchGrievanceSummary } from '../api/grievanceApi';
import type { GrievanceSummaryCard } from '../types';
import { resolveSummaryTotalCount, sortSummaryCards } from '../utils/summaryMetrics';

export interface UseGrievanceMetricsResult {
  cards: GrievanceSummaryCard[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * KPI card counts from GET /api/v1/grievances/summary.
 * Labels and order come from the backend; icons are matched by status, not position.
 */
export function useGrievanceMetrics(): UseGrievanceMetricsResult {
  const [cards, setCards] = useState<GrievanceSummaryCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    fetchGrievanceSummary({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setCards(sortSummaryCards(data?.cards ?? []));
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setCards([]);
        setError(err instanceof Error ? err.message : 'Failed to load grievance summary');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    cards,
    totalCount: resolveSummaryTotalCount(cards),
    isLoading,
    error,
    refetch,
  };
}

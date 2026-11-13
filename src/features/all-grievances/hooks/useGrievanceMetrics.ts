'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchGrievances, fetchGrievanceSummary } from '../api/grievanceApi';
import type { GrievanceSummaryCard } from '../types';
import {
  MORE_INFO_STATUS,
  needsMoreInfoCount,
  resolveSummaryTotalCount,
  sortSummaryCards,
  withInProgressBreakdown,
} from '../utils/summaryMetrics';

export interface UseGrievanceMetricsResult {
  cards: GrievanceSummaryCard[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** The outcome of one summary request, tagged with the reload token that produced it. */
interface SummaryResult {
  key: number;
  cards: GrievanceSummaryCard[];
  error: string | null;
}

/**
 * How many grievances are waiting on More Info, or null when that cannot be read. Never throws: the count only
 * fills in one line of a card, so a failure here must not take the summary down with it.
 */
async function readMoreInfoCount(signal: AbortSignal): Promise<number | null> {
  try {
    const list = await fetchGrievances({ status: [MORE_INFO_STATUS], page_size: 1 }, { signal });
    const count = list?.pagination?.total_count;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}

/**
 * KPI card counts from GET /api/v1/grievances/summary.
 * Labels and order come from the backend; icons are matched by status, not position.
 *
 * Loading is derived by comparing the last settled request to the current reload token,
 * rather than being set synchronously inside the effect.
 */
export function useGrievanceMetrics(): UseGrievanceMetricsResult {
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = reloadToken;

    fetchGrievanceSummary({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const sorted = sortSummaryCards(data?.cards ?? []);
        setResult({ key: requestKey, cards: withInProgressBreakdown(sorted, null), error: null });

        // The service sends no More Info card, so its count is read from the list. The cards are already
        // showing; this only fills the missing part in, and a failure leaves it as a dash.
        if (!needsMoreInfoCount(sorted)) return;
        void readMoreInfoCount(controller.signal).then((count) => {
          if (controller.signal.aborted || count === null) return;
          setResult({ key: requestKey, cards: withInProgressBreakdown(sorted, count), error: null });
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          cards: [],
          error: err instanceof Error ? err.message : 'Failed to load grievance summary',
        });
      });

    return () => controller.abort();
  }, [reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  const isSettled = result?.key === reloadToken;
  const cards = result?.cards ?? [];

  return {
    cards,
    totalCount: resolveSummaryTotalCount(cards),
    isLoading: !isSettled,
    error: isSettled && result ? result.error : null,
    refetch,
  };
}

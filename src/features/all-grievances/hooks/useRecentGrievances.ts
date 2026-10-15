'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchGrievances } from '../api/grievanceApi';
import type { Grievance } from '../types';
import { mapGrievanceListItem } from '../utils/mapGrievance';

export const RECENT_GRIEVANCES_LIMIT = 10;

interface RecentGrievancesState {
  grievances: Grievance[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * The newest grievances the caller may see — the same `GET /api/v1/grievances`
 * the All Grievances table reads, so its RBAC scoping (an officer's desks, an
 * admin's everything) applies here unchanged.
 */
export function useRecentGrievances(limit = RECENT_GRIEVANCES_LIMIT): RecentGrievancesState {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // The service sorts oldest first unless told otherwise.
    fetchGrievances(
      { page: 1, page_size: limit, sort_by: 'creation', sort_order: 'desc' },
      { signal: controller.signal }
    )
      .then((data) => {
        setGrievances((data?.items ?? []).map(mapGrievanceListItem));
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error && err.message ? err.message : 'load_failed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [limit, reloadKey]);

  return { grievances, isLoading, error, retry };
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorCode, classifyError } from '@/lib/api';
import { fetchAdminLevelChart } from '../api/dashboardApi';
import type { AdminLevelRow, AdminLevelStatistics } from '../types';
import { mapAdminLevels } from '../utils/mapDashboardCharts';

export type AdminLevelState =
  | { status: 'loading' }
  | { status: 'ready'; statistics: AdminLevelStatistics; isRefreshing: boolean }
  | { status: 'error'; forbidden: boolean };

export type UseAdminLevelsResult = AdminLevelState & { retry: () => void };

type Settled = { key: number; rows: AdminLevelRow[] } | { key: number; forbidden: boolean };

/**
 * The administrative-level counts, read apart from the other charts so that a service
 * without the chart (or one that fails to build it) leaves the rest of the dashboard
 * untouched. The service narrows the levels to the caller's own and the ones below it.
 */
export function useAdminLevels(): UseAdminLevelsResult {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const key = reloadToken;

    fetchAdminLevelChart({ signal: controller.signal })
      .then((rows) => {
        if (!controller.signal.aborted) setSettled({ key, rows });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({ key, forbidden: classifyError(err) === ApiErrorCode.Forbidden });
      });

    return () => controller.abort();
  }, [reloadToken]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  const rows = settled && 'rows' in settled ? settled.rows : null;
  const statistics = useMemo(() => (rows ? mapAdminLevels(rows) : null), [rows]);

  let state: AdminLevelState;
  if (settled?.key !== reloadToken) {
    state = statistics ? { status: 'ready', statistics, isRefreshing: true } : { status: 'loading' };
  } else if (settled && 'forbidden' in settled) {
    state = { status: 'error', forbidden: settled.forbidden };
  } else if (statistics) {
    state = { status: 'ready', statistics, isRefreshing: false };
  } else {
    state = { status: 'loading' };
  }

  return { ...state, retry };
}

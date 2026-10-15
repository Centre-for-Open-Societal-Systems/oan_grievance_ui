'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorCode, classifyError } from '@/lib/api';
import { fetchDashboardCharts } from '../api/dashboardApi';
import type { DashboardChartsData, DashboardStatistics } from '../types';
import { mapDashboardCharts } from '../utils/mapDashboardCharts';

export type DashboardErrorKind = 'forbidden' | 'failed';

export interface UseDashboardStatisticsResult {
  statistics: DashboardStatistics | null;
  isLoading: boolean;
  error: DashboardErrorKind | null;
  retry: () => void;
}

/** The outcome of one request, tagged with the reload token that produced it. */
interface ChartsResult {
  key: number;
  data: DashboardChartsData | null;
  error: DashboardErrorKind | null;
}

/** The service answers 200 with every chart `null` when each of them failed to build. */
function hasNoChart(data: DashboardChartsData | null): boolean {
  return !data || Object.values(data).every((rows) => rows == null);
}

/**
 * The dashboard's statistics from GET /api/v1/charts. The service narrows an
 * officer's counts to their own desks, so nothing here filters by role.
 *
 * Loading is derived by comparing the last settled request to the current reload
 * token, rather than being set synchronously inside the effect.
 */
export function useDashboardStatistics(locale = 'en'): UseDashboardStatisticsResult {
  const [result, setResult] = useState<ChartsResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = reloadToken;

    fetchDashboardCharts({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        // Nothing built means nothing to draw: report the failure rather than a page of zeros.
        setResult(
          hasNoChart(data)
            ? { key: requestKey, data: null, error: 'failed' }
            : { key: requestKey, data, error: null }
        );
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const forbidden = classifyError(err) === ApiErrorCode.Forbidden;
        setResult({ key: requestKey, data: null, error: forbidden ? 'forbidden' : 'failed' });
      });

    return () => controller.abort();
  }, [reloadToken]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  const isSettled = result?.key === reloadToken;
  const data = result?.data ?? null;
  const statistics = useMemo(() => (data ? mapDashboardCharts(data, locale) : null), [data, locale]);

  return {
    statistics,
    isLoading: !isSettled,
    error: isSettled && result ? result.error : null,
    retry,
  };
}

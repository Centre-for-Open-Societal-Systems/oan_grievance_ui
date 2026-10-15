'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorCode, classifyError } from '@/lib/api';
import { fetchDashboardCharts } from '../api/dashboardApi';
import type { DashboardCharts, DashboardStatistics } from '../types';
import { mapDashboardCharts } from '../utils/mapDashboardCharts';

export type DashboardErrorKind = 'forbidden' | 'failed';

/**
 * Exactly one of three states, so "loading with an error" or "ready without
 * statistics" cannot be represented. `isRefreshing` is a retry in flight over
 * statistics that are already on screen, which stay there meanwhile.
 */
export type DashboardState =
  | { status: 'loading' }
  | { status: 'ready'; statistics: DashboardStatistics; isRefreshing: boolean }
  | { status: 'error'; error: DashboardErrorKind };

export type UseDashboardStatisticsResult = DashboardState & { retry: () => void };

type Outcome =
  | { kind: 'charts'; charts: DashboardCharts }
  | { kind: 'error'; error: DashboardErrorKind };

/** The outcome of one request, tagged with the reload token that produced it. */
interface Settled {
  key: number;
  outcome: Outcome;
}

/** The service answers 200 with every chart `null` when each of them failed to build. */
function hasNoChart(charts: DashboardCharts): boolean {
  return Object.values(charts).every((rows) => rows === null);
}

/**
 * The dashboard's statistics from GET /api/v1/charts. The service narrows an
 * officer's counts to their own desks, so nothing here filters by role.
 *
 * Loading is derived by comparing the last settled request to the current reload
 * token, rather than being set synchronously inside the effect.
 */
export function useDashboardStatistics(locale = 'en'): UseDashboardStatisticsResult {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = reloadToken;

    fetchDashboardCharts({ signal: controller.signal })
      .then((charts) => {
        if (controller.signal.aborted) return;
        // Nothing built means nothing to draw: report the failure rather than a page of gaps.
        setSettled({
          key: requestKey,
          outcome: hasNoChart(charts) ? { kind: 'error', error: 'failed' } : { kind: 'charts', charts },
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const forbidden = classifyError(err) === ApiErrorCode.Forbidden;
        setSettled({ key: requestKey, outcome: { kind: 'error', error: forbidden ? 'forbidden' : 'failed' } });
      });

    return () => controller.abort();
  }, [reloadToken]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  // Mapping is memoized so the charts keep stable props between renders (a new
  // array would restart their animation). The React Compiler is not enabled here.
  const charts = settled?.outcome.kind === 'charts' ? settled.outcome.charts : null;
  const statistics = useMemo(() => (charts ? mapDashboardCharts(charts, locale) : null), [charts, locale]);

  const isSettled = settled?.key === reloadToken;
  let state: DashboardState;
  if (!isSettled) {
    state = statistics ? { status: 'ready', statistics, isRefreshing: true } : { status: 'loading' };
  } else if (settled?.outcome.kind === 'error') {
    state = { status: 'error', error: settled.outcome.error };
  } else if (statistics) {
    state = { status: 'ready', statistics, isRefreshing: false };
  } else {
    state = { status: 'loading' };
  }

  return { ...state, retry };
}

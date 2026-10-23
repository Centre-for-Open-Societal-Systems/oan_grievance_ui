'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorCode, classifyError } from '@/lib/api';
import { fetchAnalyticsCharts } from '../api/analyticsApi';
import type { AnalyticsCharts, AnalyticsReport } from '../types';
import { mapAnalyticsCharts } from '../utils/mapAnalyticsCharts';

export type AnalyticsErrorKind = 'forbidden' | 'failed';

/** Exactly one of three states, so "loading with an error" or "ready without a report" cannot be represented. */
export type AnalyticsState =
  | { status: 'loading' }
  | { status: 'ready'; report: AnalyticsReport }
  | { status: 'error'; error: AnalyticsErrorKind };

export type UseAnalyticsReportResult = AnalyticsState & { retry: () => void };

type Outcome =
  | { kind: 'charts'; charts: AnalyticsCharts }
  | { kind: 'error'; error: AnalyticsErrorKind };

/** The outcome of one request, tagged with the month and reload token that produced it. */
interface Settled {
  key: string;
  outcome: Outcome;
}

/** The service answers 200 with every chart `null` when each of them failed to build. */
function hasNoChart(charts: AnalyticsCharts): boolean {
  return Object.values(charts).every((rows) => rows === null);
}

/**
 * The Analytics & Reporting charts for one month, from GET /api/v1/charts. The
 * service narrows an officer's charts to their own desks, so nothing here filters
 * by role.
 *
 * Loading is derived by comparing the last settled request to the current request
 * key (month + reload token), rather than being set synchronously inside the
 * effect. Picking another month goes back to loading instead of leaving the
 * previous month's numbers under the new month's name.
 */
export function useAnalyticsReport(month: string, locale = 'en'): UseAnalyticsReportResult {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${month}:${reloadToken}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchAnalyticsCharts({ month, signal: controller.signal })
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
  }, [month, requestKey]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  // Mapping is memoized so the charts keep stable props between renders (a new
  // array would restart their animation). The React Compiler is not enabled here.
  const charts = settled?.key === requestKey && settled.outcome.kind === 'charts' ? settled.outcome.charts : null;
  const report = useMemo(() => (charts ? mapAnalyticsCharts(charts, locale) : null), [charts, locale]);

  let state: AnalyticsState;
  if (settled?.key !== requestKey) {
    state = { status: 'loading' };
  } else if (settled.outcome.kind === 'error') {
    state = { status: 'error', error: settled.outcome.error };
  } else if (report) {
    state = { status: 'ready', report };
  } else {
    state = { status: 'loading' };
  }

  return { ...state, retry };
}

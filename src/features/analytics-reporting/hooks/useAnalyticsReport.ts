'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorCode, classifyError } from '@/lib/api';
import { fetchAnalyticsCharts, type AnalyticsResponse } from '../api/analyticsApi';
import type { AnalyticsFilters, AnalyticsReport } from '../types';
import { mapAnalyticsCharts } from '../utils/mapAnalyticsCharts';

export type AnalyticsErrorKind = 'forbidden' | 'failed';

/** Exactly one of three states, so "loading with an error" or "ready without a report" cannot be represented. */
export type AnalyticsState =
  | { status: 'loading' }
  | { status: 'ready'; report: AnalyticsReport; asOf: string | null }
  | { status: 'error'; error: AnalyticsErrorKind };

export type UseAnalyticsReportResult = AnalyticsState & { retry: () => void };

type Outcome = { kind: 'response'; response: AnalyticsResponse } | { kind: 'error'; error: AnalyticsErrorKind };

/** The outcome of one request, tagged with the request (month, filters, reload) that produced it. */
interface Settled {
  key: string;
  outcome: Outcome;
}

/** The service answers 200 with every chart `null` when each of them failed to build. */
function hasNoChart(response: AnalyticsResponse): boolean {
  return Object.values(response.charts).every((rows) => rows === null);
}

/**
 * The Analytics & Reporting charts for one month and set of filters, from
 * GET /api/v1/charts. The service narrows an officer's charts to their own
 * desks, so nothing here filters by role.
 *
 * Loading is derived by comparing the last settled request to the current request
 * key, rather than being set synchronously inside the effect. Picking another
 * month or filter goes back to loading instead of leaving the previous numbers
 * under the new selection's name.
 */
export function useAnalyticsReport(
  month: string,
  filters: AnalyticsFilters,
  locale = 'en'
): UseAnalyticsReportResult {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { region, serviceCategory, assignedDept } = filters;
  const requestKey = JSON.stringify([month, region, serviceCategory, assignedDept, reloadToken]);

  useEffect(() => {
    // No month yet: the page is waiting for the browser to say which month it is. Nothing to ask for.
    if (!month) return;
    const controller = new AbortController();

    fetchAnalyticsCharts({ month, filters: { region, serviceCategory, assignedDept }, signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        // Nothing built means nothing to draw: report the failure rather than a page of gaps.
        setSettled({
          key: requestKey,
          outcome: hasNoChart(response) ? { kind: 'error', error: 'failed' } : { kind: 'response', response },
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const forbidden = classifyError(err) === ApiErrorCode.Forbidden;
        setSettled({ key: requestKey, outcome: { kind: 'error', error: forbidden ? 'forbidden' : 'failed' } });
      });

    return () => controller.abort();
  }, [month, region, serviceCategory, assignedDept, requestKey]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  // Mapping is memoized so the charts keep stable props between renders (a new
  // array would restart their animation). The React Compiler is not enabled here.
  const response = settled?.key === requestKey && settled.outcome.kind === 'response' ? settled.outcome.response : null;
  const report = useMemo(() => (response ? mapAnalyticsCharts(response.charts, locale) : null), [response, locale]);

  let state: AnalyticsState;
  if (settled?.key !== requestKey) {
    state = { status: 'loading' };
  } else if (settled.outcome.kind === 'error') {
    state = { status: 'error', error: settled.outcome.error };
  } else if (report && response) {
    state = { status: 'ready', report, asOf: response.asOf };
  } else {
    state = { status: 'loading' };
  }

  return { ...state, retry };
}

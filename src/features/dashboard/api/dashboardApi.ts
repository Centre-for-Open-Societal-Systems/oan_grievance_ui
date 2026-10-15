import { fetchApi } from '@/lib/api';
import type { DashboardChartsData } from '../types';

export const DASHBOARD_CHART_IDS = [
  'grvKpis',
  'grvStatusDistribution',
  'grvByCategory',
  'grvMonthlyTrend',
] as const;

export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * The dashboard's charts in one round trip. An officer gets counts for their own
 * desks; an admin gets everything. A chart the service could not build is `null`.
 *
 * Corresponding REST endpoint: GET /api/v1/charts?charts=...
 */
export async function fetchDashboardCharts(
  options: RequestOptions = {}
): Promise<DashboardChartsData> {
  return fetchApi<DashboardChartsData>(
    `/api/v1/charts?charts=${DASHBOARD_CHART_IDS.join(',')}`,
    { method: 'GET', signal: options.signal }
  );
}

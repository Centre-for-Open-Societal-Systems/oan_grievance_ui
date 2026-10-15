import { fetchApi } from '@/lib/api';
import { DASHBOARD_CHART_SCHEMAS, type DashboardChartId, type DashboardCharts } from '../schemas';

export const DASHBOARD_CHART_IDS = Object.keys(DASHBOARD_CHART_SCHEMAS) as DashboardChartId[];

export interface DashboardRequestOptions {
  signal?: AbortSignal;
}

/**
 * Parses each chart of the response on its own. A chart the service could not
 * build (`null`), left out, or sent in a shape this app does not know becomes
 * `null`, so a renamed backend field shows as an unavailable section instead of
 * flowing into the charts as `undefined` or `NaN`.
 */
export function parseDashboardCharts(raw: unknown): DashboardCharts {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Unexpected dashboard response');
  }
  const body = raw as Record<string, unknown>;
  const parsed = {} as DashboardCharts;
  for (const id of DASHBOARD_CHART_IDS) {
    const result = DASHBOARD_CHART_SCHEMAS[id].safeParse(body[id]);
    // The union of each chart's row type is what `parsed[id]` takes; every id uses its own schema.
    (parsed as Record<DashboardChartId, unknown>)[id] = result.success ? result.data : null;
  }
  return parsed;
}

/**
 * The dashboard's charts in one round trip. An officer gets counts for their own
 * desks; an admin gets everything.
 *
 * Corresponding REST endpoint: GET /api/v1/charts?charts=...
 */
export async function fetchDashboardCharts(
  options: DashboardRequestOptions = {}
): Promise<DashboardCharts> {
  const raw = await fetchApi<unknown>(`/api/v1/charts?charts=${DASHBOARD_CHART_IDS.join(',')}`, {
    method: 'GET',
    signal: options.signal,
  });
  return parseDashboardCharts(raw);
}

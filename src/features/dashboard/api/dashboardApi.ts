import { fetchApi } from '@/lib/api';
import {
  ADMIN_LEVEL_CHART_ID,
  DASHBOARD_CHART_SCHEMAS,
  adminLevelChartSchema,
  type AdminLevelRow,
  type DashboardChartId,
  type DashboardCharts,
} from '../schemas';

export const DASHBOARD_CHART_IDS = Object.keys(DASHBOARD_CHART_SCHEMAS) as DashboardChartId[];

export interface DashboardRequestOptions {
  signal?: AbortSignal;
  /** A region code: narrows every chart to that region (the service's `region` filter). */
  region?: string | null;
}

function regionQuery(region: string | null | undefined): string {
  return region ? `&region=${encodeURIComponent(region)}` : '';
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
  const raw = await fetchApi<unknown>(`/api/v1/charts?charts=${DASHBOARD_CHART_IDS.join(',')}${regionQuery(options.region)}`, {
    method: 'GET',
    signal: options.signal,
  });
  return parseDashboardCharts(raw);
}

/**
 * The administrative-level counts: the federal total and each region and woreda the caller may
 * read. Always unfiltered, so picking a region on the dashboard does not shrink the list it is
 * picked from. Throws when the chart is unavailable or in a shape this app does not know.
 *
 * Corresponding REST endpoint: GET /api/v1/charts?charts=grvByAdminLevel
 */
export async function fetchAdminLevelChart(
  options: Pick<DashboardRequestOptions, 'signal'> = {}
): Promise<AdminLevelRow[]> {
  const raw = await fetchApi<unknown>(`/api/v1/charts?charts=${ADMIN_LEVEL_CHART_ID}`, {
    method: 'GET',
    signal: options.signal,
  });
  return parseAdminLevelChart(raw);
}

export function parseAdminLevelChart(raw: unknown): AdminLevelRow[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Unexpected dashboard response');
  }
  const result = adminLevelChartSchema.safeParse((raw as Record<string, unknown>)[ADMIN_LEVEL_CHART_ID]);
  if (!result.success) throw new Error('The administrative-level chart is unavailable');
  return result.data;
}

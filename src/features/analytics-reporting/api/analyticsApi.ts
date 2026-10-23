import { fetchApi } from '@/lib/api';
import { ANALYTICS_CHART_SCHEMAS, type AnalyticsChartId, type AnalyticsCharts } from '../schemas';

export const ANALYTICS_CHART_IDS = Object.keys(ANALYTICS_CHART_SCHEMAS) as AnalyticsChartId[];

/** The charts a service from before the Avg Resolution and Performance Score charts already has. */
const ESTABLISHED_CHART_IDS = ANALYTICS_CHART_IDS.filter(
  (id) => id !== 'grvAvgResolutionByCategory' && id !== 'grvPerformanceScore'
);

export interface AnalyticsRequestOptions {
  /** `YYYY-MM`. Drives the KPI cards, and the weekly and category charts through `from`/`to`; the service uses its own windows when it is left out. */
  month?: string;
  signal?: AbortSignal;
}

/**
 * Parses each chart of the response on its own. A chart the service could not
 * build (`null`), left out, or sent in a shape this app does not know becomes
 * `null`, so a renamed backend field shows as an unavailable section instead of
 * flowing into the charts as `undefined` or `NaN`.
 */
export function parseAnalyticsCharts(raw: unknown): AnalyticsCharts {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Unexpected analytics response');
  }
  const body = raw as Record<string, unknown>;
  const parsed = {} as AnalyticsCharts;
  for (const id of ANALYTICS_CHART_IDS) {
    const result = ANALYTICS_CHART_SCHEMAS[id].safeParse(body[id]);
    // The union of each chart's row type is what `parsed[id]` takes; every id uses its own schema.
    (parsed as Record<AnalyticsChartId, unknown>)[id] = result.success ? result.data : null;
  }
  return parsed;
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * The first and last day (`YYYY-MM-DD`) of a `YYYY-MM` month, so the weekly and
 * category charts — which take `from`/`to`, not `month` — show the same month as
 * the cards. The last day stops at today for the current month. Null for anything
 * that is not a month.
 */
export function monthRange(month: string, today = new Date()): { from: string; to: string } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  const from = isoDate(new Date(year, index, 1));
  const lastDay = isoDate(new Date(year, index + 1, 0));
  const todayDate = isoDate(today);
  return { from, to: lastDay < todayDate ? lastDay : todayDate };
}

/**
 * The Analytics & Reporting charts in one round trip. An officer gets the same
 * charts narrowed to their own desks; an admin gets everything.
 *
 * Corresponding REST endpoint: GET /api/v1/charts?charts=...&month=YYYY-MM&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function fetchAnalyticsCharts(options: AnalyticsRequestOptions = {}): Promise<AnalyticsCharts> {
  try {
    return await requestCharts(ANALYTICS_CHART_IDS, options);
  } catch (err) {
    // A service that predates the newer charts answers 404 for the whole request (an unknown
    // chart id). Ask again for the charts it does know; the newer ones show as unavailable.
    if ((err as { status?: unknown })?.status !== 404 || options.signal?.aborted) throw err;
    return requestCharts(ESTABLISHED_CHART_IDS, options);
  }
}

async function requestCharts(ids: AnalyticsChartId[], options: AnalyticsRequestOptions): Promise<AnalyticsCharts> {
  const params = new URLSearchParams({ charts: ids.join(',') });
  if (options.month) {
    params.set('month', options.month);
    const range = monthRange(options.month);
    if (range) {
      params.set('from', range.from);
      params.set('to', range.to);
    }
  }
  // URLSearchParams would encode the commas in `charts`; the service accepts that, but keep the URL readable.
  const query = params.toString().replace(/%2C/g, ',');

  const raw = await fetchApi<unknown>(`/api/v1/charts?${query}`, {
    method: 'GET',
    signal: options.signal,
  });
  return parseAnalyticsCharts(raw);
}

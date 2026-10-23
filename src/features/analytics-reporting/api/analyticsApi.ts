import type { z } from 'zod';
import { fetchApi } from '@/lib/api';
import {
  ANALYTICS_CHART_SCHEMAS,
  FILTER_OPTION_SCHEMAS,
  type AnalyticsChartId,
  type AnalyticsCharts,
  type FilterOptionChartId,
} from '../schemas';
import type { AnalyticsFilterOptions, AnalyticsFilters } from '../types';
import { currentMonth } from '../utils/months';

export const ANALYTICS_CHART_IDS = Object.keys(ANALYTICS_CHART_SCHEMAS) as AnalyticsChartId[];

/** The charts a service from before the Avg Resolution and Performance Score charts already has. */
const ESTABLISHED_CHART_IDS = ANALYTICS_CHART_IDS.filter(
  (id) => id !== 'grvAvgResolutionByCategory' && id !== 'grvPerformanceScore'
);

export interface AnalyticsRequestOptions {
  /** `YYYY-MM`. Drives the KPI cards, and the weekly and category charts through `from`/`to`; the service uses its own windows when it is left out. */
  month?: string;
  /** Narrow every chart to one region, service category or department. An empty value means all. */
  filters?: AnalyticsFilters;
  signal?: AbortSignal;
}

/** The parsed charts, and when the oldest of them was last refreshed. */
export interface AnalyticsResponse {
  charts: AnalyticsCharts;
  /** ISO timestamp, or null when the service did not say. */
  asOf: string | null;
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

/**
 * When the data on screen was last refreshed: the oldest `meta.as_of` among the
 * charts, since the page is only as fresh as its stalest chart. Null when the
 * service sent none that is a date.
 */
export function parseAsOf(raw: unknown): string | null {
  const meta = (raw as { meta?: { as_of?: unknown } } | null)?.meta;
  const asOf = meta?.as_of;
  if (!asOf || typeof asOf !== 'object' || Array.isArray(asOf)) return null;

  let oldest: { time: number; iso: string } | null = null;
  for (const value of Object.values(asOf)) {
    if (typeof value !== 'string') continue;
    const time = Date.parse(value);
    if (Number.isNaN(time)) continue;
    if (!oldest || time < oldest.time) oldest = { time, iso: value };
  }
  return oldest?.iso ?? null;
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

/** The query string of a charts request. */
function chartsQuery(ids: string[], options: AnalyticsRequestOptions): string {
  const params = new URLSearchParams({ charts: ids.join(',') });
  if (options.month) {
    const range = monthRange(options.month);
    if (options.month === currentMonth()) {
      // The current month is the service's own default for `month` and `to` (today). Leaving them out
      // keeps the service's clock in charge, so a viewer whose time zone is ahead of it is never
      // refused for asking about a month that has not begun there. `from` is still the 1st.
      if (range) params.set('from', range.from);
    } else {
      params.set('month', options.month);
      if (range) {
        params.set('from', range.from);
        params.set('to', range.to);
      }
    }
  }
  const { region, serviceCategory, assignedDept } = options.filters ?? {};
  if (region) params.set('region', region);
  if (serviceCategory) params.set('service_category', serviceCategory);
  if (assignedDept) params.set('assigned_dept', assignedDept);
  // URLSearchParams would encode the commas in `charts`; the service accepts that, but keep the URL readable.
  return params.toString().replace(/%2C/g, ',');
}

async function requestCharts(ids: AnalyticsChartId[], options: AnalyticsRequestOptions): Promise<AnalyticsResponse> {
  const raw = await fetchApi<unknown>(
    `/api/v1/charts?${chartsQuery(ids, options)}`,
    { method: 'GET', signal: options.signal },
    undefined,
    { includeMeta: true }
  );
  return { charts: parseAnalyticsCharts(raw), asOf: parseAsOf(raw) };
}

/**
 * The Analytics & Reporting charts in one round trip. An officer gets the same
 * charts narrowed to their own desks; an admin gets everything.
 *
 * Corresponding REST endpoint: GET /api/v1/charts?charts=...&month=YYYY-MM&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function fetchAnalyticsCharts(options: AnalyticsRequestOptions = {}): Promise<AnalyticsResponse> {
  try {
    return await requestCharts(ANALYTICS_CHART_IDS, options);
  } catch (err) {
    // A service that predates the newer charts answers 404 for the whole request (an unknown
    // chart id). Ask again for the charts it does know; the newer ones show as unavailable.
    if ((err as { status?: unknown })?.status !== 404 || options.signal?.aborted) throw err;
    return requestCharts(ESTABLISHED_CHART_IDS, options);
  }
}

/**
 * One option list, or null when it could not be read. Each list is its own
 * request: the service answers 404 to the whole call when it does not know one
 * chart id (a list it lacks, or the department list for anyone but an admin),
 * and one missing list must not take the others' controls with it.
 */
async function loadOptions<Id extends FilterOptionChartId>(
  id: Id,
  signal: AbortSignal | undefined
): Promise<z.infer<(typeof FILTER_OPTION_SCHEMAS)[Id]> | null> {
  try {
    const raw = await fetchApi<Record<string, unknown> | null>(`/api/v1/charts?charts=${id}`, {
      method: 'GET',
      signal,
    });
    const rows = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw[id] : undefined;
    const parsed = FILTER_OPTION_SCHEMAS[id].safeParse(rows);
    return parsed.success ? (parsed.data as z.infer<(typeof FILTER_OPTION_SCHEMAS)[Id]>) : null;
  } catch {
    return null;
  }
}

/**
 * What the filters can be set to. A list that cannot be read is null, and its
 * control is left out. The department list is for an admin only.
 */
export async function fetchFilterOptions(
  options: { includeDepartments: boolean; signal?: AbortSignal }
): Promise<AnalyticsFilterOptions> {
  const [regions, categories, departments] = await Promise.all([
    loadOptions('grvFilterRegions', options.signal),
    loadOptions('grvFilterCategories', options.signal),
    options.includeDepartments ? loadOptions('grvFilterDepartments', options.signal) : null,
  ]);

  return {
    regions: regions?.map((row) => ({ value: row.region_code, label: row.region_name?.trim() || row.region_code })) ?? null,
    categories: categories?.map((row) => ({ value: row.category, label: row.category })) ?? null,
    departments: departments?.map((row) => ({ value: row.department, label: row.department })) ?? null,
  };
}

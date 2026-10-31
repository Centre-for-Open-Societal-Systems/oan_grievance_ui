import type {
  AdminAreaStat,
  AdminLevelRow,
  AdminLevelStatistics,
  CategoryRow,
  DashboardCharts,
  DashboardStatistics,
  KpiCard,
  KpiMetric,
  KpiRow,
  MonthlyTrendPoint,
  MonthlyTrendRow,
  ServiceCategoryStat,
  StatusDistributionSlice,
  StatusRow,
} from '../types';

/** The cards in the order the dashboard shows them. */
const KPI_ORDER: KpiMetric[] = ['total', 'awaiting_action', 'resolved', 'escalated'];

/**
 * The service names a status by its workflow label and sends no id or colour, so
 * the colour is looked up by label (case and spacing forgiven). A label this app
 * has not met gets the grey fallback rather than breaking the donut.
 */
export const STATUS_COLORS: Record<string, string> = {
  submitted: '#0ea5e9',
  assigned: '#4f46e5',
  'in progress': '#16a34a',
  'under review': '#7c3aed',
  'more info needed': '#db2777',
  resolved: '#0f766e',
  closed: '#374151',
  rejected: '#dc2626',
};
const FALLBACK_STATUS_COLOR = '#9ca3af';

/** Bar colours, cycled by rank. Full class names so Tailwind sees them. */
const CATEGORY_COLORS = ['bg-[#0ea5e9]', 'bg-[#16a34a]', 'bg-[#f59e0b]', 'bg-[#7c3aed]', 'bg-[#db2777]'];
const REMAINDER_COLOR = 'bg-gray-400';

function categoryColor(rank: number): string {
  return CATEGORY_COLORS[rank % CATEGORY_COLORS.length] ?? 'bg-[#0ea5e9]';
}

/** How many categories the card lists by name; any further ones are added up in one row. */
export const SERVICE_CATEGORY_LIMIT = 5;

function mapKpis(rows: KpiRow[] | null): KpiCard[] | null {
  if (!rows) return null;
  const byMetric = new Map(rows.map((row) => [row.metric, row]));
  return KPI_ORDER.map((metric) => {
    const row = byMetric.get(metric);
    const type = metric === 'total' ? 'percentage' : metric === 'escalated' ? 'alert' : 'number';
    let trend: number | null = null;
    if (metric === 'total') {
      trend = row?.delta_pct ?? null;
    } else if (metric !== 'escalated') {
      // "New / resolved this week" is a count: a negative one means nothing, so it is not shown.
      trend = row?.delta !== undefined && row.delta >= 0 ? row.delta : null;
    }
    return { metric, value: row?.value ?? null, trend, type };
  });
}

/** A status label with case, spacing and `_`/`-` forgiven — the key colours and translations are looked up by. */
export function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function mapStatusDistribution(rows: StatusRow[] | null): StatusDistributionSlice[] | null {
  if (!rows) return null;
  return rows.map((row) => ({
    name: row.status,
    value: row.count,
    color: STATUS_COLORS[normalizeStatus(row.status)] ?? FALLBACK_STATUS_COLOR,
  }));
}

const UNCATEGORISED_KEY = '';

function mapServiceCategories(rows: CategoryRow[] | null): ServiceCategoryStat[] | null {
  if (!rows) return null;

  // A missing, null or blank category is one bucket, not several look-alike rows.
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.category?.trim() || UNCATEGORISED_KEY;
    totals.set(key, (totals.get(key) ?? 0) + row.count);
  }
  const ranked = [...totals.entries()]
    .filter(([, count]) => count > 0)
    .sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB));

  const listed = ranked.slice(0, SERVICE_CATEGORY_LIMIT);
  const rest = ranked.slice(SERVICE_CATEGORY_LIMIT);
  const remainderTotal = rest.reduce((sum, [, count]) => sum + count, 0);
  const max = Math.max(1, ...listed.map(([, count]) => count), remainderTotal);

  const stats: ServiceCategoryStat[] = listed.map(([key, value], rank) => ({
    key: key === UNCATEGORISED_KEY ? 'uncategorised' : `category:${key}`,
    kind: key === UNCATEGORISED_KEY ? 'uncategorised' : 'category',
    name: key,
    value,
    max,
    color: categoryColor(rank),
  }));
  if (rest.length > 0) {
    stats.push({
      key: 'remainder',
      kind: 'remainder',
      name: '',
      value: remainderTotal,
      max,
      color: REMAINDER_COLOR,
      categories: rest.length,
    });
  }
  return stats;
}

/** `2026-03` → `Mar 2026`. Anything that is not a `YYYY-MM` key passes through unchanged. */
export function formatMonthKey(key: string, locale = 'en'): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!match) return key;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  } catch {
    return key;
  }
}

function mapMonthlyTrend(rows: MonthlyTrendRow[] | null, locale: string): MonthlyTrendPoint[] | null {
  if (!rows) return null;
  return rows.map((row) => ({
    month: formatMonthKey(row.month, locale),
    submitted: row.submitted,
    resolved: row.resolved,
  }));
}

/**
 * Turns the parsed charts into what the dashboard components draw. A chart that
 * is unavailable maps to `null` — never to zeros, which would read as "no cases".
 */
export function mapDashboardCharts(charts: DashboardCharts, locale = 'en'): DashboardStatistics {
  const kpis = mapKpis(charts.grvKpis);
  return {
    kpis,
    monthlyTrend: mapMonthlyTrend(charts.grvMonthlyTrend, locale),
    statusDistribution: mapStatusDistribution(charts.grvStatusDistribution),
    serviceCategories: mapServiceCategories(charts.grvByCategory),
    escalated: kpis?.find((card) => card.metric === 'escalated')?.value ?? null,
  };
}

function mapAreas(rows: AdminLevelRow[], level: 'region' | 'woreda'): AdminAreaStat[] {
  const areas: AdminAreaStat[] = [];
  for (const row of rows) {
    if (row.level !== level || !row.code || row.count <= 0) continue;
    areas.push({
      code: row.code,
      name: row.name?.trim() || row.code,
      value: row.count,
      regionCode: row.region_code,
    });
  }
  return areas;
}

/**
 * The administrative-level card from its rows. The service already ranks regions and woredas
 * by count and leaves out empty ones, and sends only the levels the caller may read; a level
 * that is absent maps to an empty part, not to zeros.
 */
export function mapAdminLevels(rows: AdminLevelRow[]): AdminLevelStatistics {
  const federal = rows.find((row) => row.level === 'federal');
  return {
    federal: federal ? { name: federal.name?.trim() || null, value: federal.count } : null,
    regions: mapAreas(rows, 'region'),
    woredas: mapAreas(rows, 'woreda'),
  };
}

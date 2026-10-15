import type {
  CategoryRow,
  DashboardChartsData,
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
const KPI_ORDER: { metric: KpiMetric; title: string }[] = [
  { metric: 'total', title: 'Total Grievances' },
  { metric: 'awaiting_action', title: 'Awaiting Action' },
  { metric: 'resolved', title: 'Resolved' },
  { metric: 'escalated', title: 'Escalated' },
];

const STATUS_COLORS: Record<string, string> = {
  Submitted: '#4f46e5',
  Assigned: '#3b82f6',
  'In Progress': '#6366f1',
  'More Info Needed': '#f97316',
  Resolved: '#10b981',
  Closed: '#374151',
  Rejected: '#ef4444',
};
const FALLBACK_STATUS_COLOR = '#9ca3af';

/** Bar colours, cycled by rank. Full class names so Tailwind sees them. */
const CATEGORY_COLORS = ['bg-[#2563eb]', 'bg-[#6366f1]', 'bg-[#a855f7]', 'bg-[#c084fc]', 'bg-[#d8b4fe]'];

function categoryColor(rank: number): string {
  return CATEGORY_COLORS[rank % CATEGORY_COLORS.length] ?? 'bg-[#2563eb]';
}

/** How many categories the card lists — the busiest ones. */
export const SERVICE_CATEGORY_LIMIT = 5;

const UNCATEGORISED = 'Uncategorised';

function mapKpis(rows: KpiRow[] | null | undefined): KpiCard[] {
  const byMetric = new Map((rows ?? []).map((row) => [row.metric, row]));
  return KPI_ORDER.map(({ metric, title }) => {
    const row = byMetric.get(metric);
    const type = metric === 'total' ? 'percentage' : metric === 'escalated' ? 'alert' : 'number';
    const trend = metric === 'total' ? row?.delta_pct : row?.delta;
    return { metric, title, value: row?.value ?? 0, trend: trend ?? null, type };
  });
}

function mapStatusDistribution(rows: StatusRow[] | null | undefined): StatusDistributionSlice[] {
  return (rows ?? []).map((row) => ({
    name: row.status,
    value: row.count,
    color: STATUS_COLORS[row.status] ?? FALLBACK_STATUS_COLOR,
  }));
}

function mapServiceCategories(rows: CategoryRow[] | null | undefined): ServiceCategoryStat[] {
  const top = [...(rows ?? [])]
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, SERVICE_CATEGORY_LIMIT);
  const max = Math.max(1, ...top.map((row) => row.count));
  return top.map((row, rank) => ({
    name: row.category || UNCATEGORISED,
    value: row.count,
    max,
    color: categoryColor(rank),
  }));
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

function mapMonthlyTrend(rows: MonthlyTrendRow[] | null | undefined, locale: string): MonthlyTrendPoint[] {
  return (rows ?? []).map((row) => ({
    month: formatMonthKey(row.month, locale),
    submitted: row.submitted,
    resolved: row.resolved,
  }));
}

/** Turns the charts response into what the dashboard components draw. A missing or failed chart maps to empty, not an error. */
export function mapDashboardCharts(data: DashboardChartsData | null | undefined, locale = 'en'): DashboardStatistics {
  const kpis = mapKpis(data?.grvKpis);
  return {
    kpis,
    monthlyTrend: mapMonthlyTrend(data?.grvMonthlyTrend, locale),
    statusDistribution: mapStatusDistribution(data?.grvStatusDistribution),
    serviceCategories: mapServiceCategories(data?.grvByCategory),
    escalated: kpis.find((card) => card.metric === 'escalated')?.value ?? 0,
  };
}

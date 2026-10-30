"use client";

import { useRef, useState, useSyncExternalStore, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isAdmin } from "@/features/auth/rbac";
import { selectUser } from "@/features/auth/store/authSlice";
import { useAppSelector } from "@/store/hooks";
import { useAnalyticsFilterOptions } from "./hooks/useAnalyticsFilterOptions";
import { useAnalyticsReport } from "./hooks/useAnalyticsReport";
import { currentMonth } from "./utils/months";
import { NO_FILTERS, type AnalyticsFilters, type AnalyticsReport } from "./types";
import { AnalyticsFiltersBar } from "./components/AnalyticsFiltersBar";
import { AnalyticsSkeleton } from "./components/AnalyticsSkeleton";
import { AvgResolutionChart } from "./components/AvgResolutionChart";
import { CARD_WHITE } from "./components/cardStyles";
import { ChartErrorBoundary } from "./components/ChartErrorBoundary";
import { CHART_MIN_HEIGHT, SKELETON_KPI_HEIGHT } from "./components/chartTheme";
import { PerformanceScoreChart } from "./components/PerformanceScoreChart";
import { PerformanceKpiCards } from "./components/PerformanceKpiCards";
import { ResolutionRegionChart } from "./components/ResolutionRegionChart";
import { SectionUnavailable } from "./components/SectionUnavailable";
import { TopHeader } from "./components/TopHeader";
import { VolumeServiceChart } from "./components/VolumeServiceChart";
import { WeeklySubmissionChart } from "./components/WeeklySubmissionChart";

interface SectionsProps {
  readonly report: AnalyticsReport;
  readonly onRetry: () => void;
}

/**
 * The charts that loaded. One that did not stands in as an unavailable section, in the
 * same place, and so does one that throws while drawing: each sits in its own boundary.
 */
function AnalyticsSections({ report, onRetry }: SectionsProps): ReactElement {
  const { kpis, weeklyTrend, regions, categories, avgResolution, performanceScore } = report;
  const unavailable = (className = ""): ReactElement => <SectionUnavailable onRetry={onRetry} className={className} />;
  const guarded = (node: ReactElement, className = ""): ReactElement => (
    <ChartErrorBoundary className={className}>{node}</ChartErrorBoundary>
  );
  const wide = `${CHART_MIN_HEIGHT} lg:col-span-2`;

  return (
    <>
      {kpis ? guarded(<PerformanceKpiCards data={kpis} />, SKELETON_KPI_HEIGHT) : unavailable(SKELETON_KPI_HEIGHT)}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1">
        {weeklyTrend ? guarded(<WeeklySubmissionChart data={weeklyTrend} />, CHART_MIN_HEIGHT) : unavailable(CHART_MIN_HEIGHT)}
        {regions ? guarded(<ResolutionRegionChart data={regions} />, CHART_MIN_HEIGHT) : unavailable(CHART_MIN_HEIGHT)}
        {categories ? guarded(<VolumeServiceChart data={categories} />, CHART_MIN_HEIGHT) : unavailable(CHART_MIN_HEIGHT)}
        {avgResolution ? guarded(<AvgResolutionChart data={avgResolution} />, CHART_MIN_HEIGHT) : unavailable(CHART_MIN_HEIGHT)}
        {performanceScore ? (
          <div className="lg:col-span-2">{guarded(<PerformanceScoreChart data={performanceScore} />, wide)}</div>
        ) : (
          unavailable(wide)
        )}
      </div>
    </>
  );
}

interface AnalyticsFailedProps {
  readonly isForbidden: boolean;
  readonly onRetry: () => void;
}

/** Nothing could be loaded at all: say why, and offer a retry unless the caller is simply not allowed. */
function AnalyticsFailed({ isForbidden, onRetry }: AnalyticsFailedProps): ReactElement {
  const t = useTranslations("analytics");

  return (
    <div className={`${CARD_WHITE} p-6`}>
      <p role="alert" className="text-sm text-red-600">
        {isForbidden ? t("forbidden") : t("loadFailed")}
        {!isForbidden && (
          <>
            {" "}
            <button type="button" onClick={onRetry} className="underline font-semibold">
              {t("retry")}
            </button>
          </>
        )}
      </p>
    </div>
  );
}

const subscribeNever = (): (() => void) => () => {};

/**
 * Performance metrics from GET /api/v1/charts (the Dashboard's endpoint, other
 * charts). The month picker drives the KPI cards and radar (`month`) and the weekly
 * trend and category charts (`from`/`to`); the region chart is an all-time snapshot.
 * The filters narrow all of them.
 */
export function AnalyticsReportingPage(): ReactElement {
  const locale = useLocale();
  // The viewer's current month. The server has no viewer clock to agree with, so it renders "" and
  // the browser fills in the real month after hydration: the two never disagree at a month boundary.
  // Read on every render, not frozen, so a tab left open across a boundary can pick the new month.
  const maxMonth = useSyncExternalStore(subscribeNever, currentMonth, () => "");
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const month = pickedMonth ?? maxMonth;
  const [filters, setFilters] = useState<AnalyticsFilters>(NO_FILTERS);
  // Only an admin can narrow by department: the service answers 404 for that list to anyone else.
  const userIsAdmin = isAdmin(useAppSelector(selectUser)?.roles ?? []);
  const filterOptions = useAnalyticsFilterOptions(userIsAdmin);
  const state = useAnalyticsReport(month, filters, locale);
  const bodyRef = useRef<HTMLDivElement>(null);

  // The Retry button of a failed page is replaced by the loading state; move focus to
  // the body (which stays mounted) so a keyboard user is not dropped back on <body>.
  const retryFromFailure = (): void => {
    bodyRef.current?.focus();
    state.retry();
  };

  return (
    <div className="flex flex-col gap-6 font-sans pb-2">
      <TopHeader
        month={month}
        maxMonth={maxMonth}
        onMonthChange={setPickedMonth}
        asOf={state.status === "ready" ? state.asOf : null}
      />
      <AnalyticsFiltersBar options={filterOptions} filters={filters} onChange={setFilters} />

      <div ref={bodyRef} tabIndex={-1} className="flex flex-col gap-6 outline-none">
        {state.status === "ready" && <AnalyticsSections report={state.report} onRetry={state.retry} />}
        {state.status === "loading" && <AnalyticsSkeleton />}
        {state.status === "error" && (
          <AnalyticsFailed isForbidden={state.error === "forbidden"} onRetry={retryFromFailure} />
        )}
      </div>
    </div>
  );
}

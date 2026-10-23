"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAnalyticsReport } from "./hooks/useAnalyticsReport";
import type { AnalyticsReport } from "./types";
import { AnalyticsSkeleton } from "./components/AnalyticsSkeleton";
import { AvgResolutionChart } from "./components/AvgResolutionChart";
import { CARD_WHITE } from "./components/cardStyles";
import { PerformanceScoreChart } from "./components/PerformanceScoreChart";
import { PerformanceKpiCards } from "./components/PerformanceKpiCards";
import { ResolutionRegionChart } from "./components/ResolutionRegionChart";
import { SectionUnavailable } from "./components/SectionUnavailable";
import { TopHeader } from "./components/TopHeader";
import { VolumeServiceChart } from "./components/VolumeServiceChart";
import { WeeklySubmissionChart } from "./components/WeeklySubmissionChart";

/** The current month as `YYYY-MM`, in the viewer's time zone — the service refuses a future month. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface SectionsProps {
  report: AnalyticsReport;
  onRetry: () => void;
}

/** The charts that loaded. One that did not stands in as an unavailable section, in the same place. */
function AnalyticsSections({ report, onRetry }: SectionsProps) {
  const { kpis, weeklyTrend, regions, categories, avgResolution, performanceScore } = report;
  const unavailable = (className = "") => <SectionUnavailable onRetry={onRetry} className={className} />;

  return (
    <>
      {kpis ? <PerformanceKpiCards data={kpis} /> : unavailable("h-[130px]")}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1">
        {weeklyTrend ? <WeeklySubmissionChart data={weeklyTrend} /> : unavailable("min-h-[380px]")}
        {regions ? <ResolutionRegionChart data={regions} /> : unavailable("min-h-[380px]")}
        {categories ? <VolumeServiceChart data={categories} /> : unavailable("min-h-[380px]")}
        {avgResolution ? <AvgResolutionChart data={avgResolution} /> : unavailable("min-h-[380px]")}
        {performanceScore ? (
          <div className="lg:col-span-2">
            <PerformanceScoreChart data={performanceScore} />
          </div>
        ) : (
          unavailable("min-h-[380px] lg:col-span-2")
        )}
      </div>
    </>
  );
}

/** Nothing could be loaded at all: say why, and offer a retry unless the caller is simply not allowed. */
function AnalyticsFailed({ forbidden, onRetry }: { forbidden: boolean; onRetry: () => void }) {
  const t = useTranslations("analytics");

  return (
    <div className={`${CARD_WHITE} p-6`}>
      <p role="alert" className="text-sm text-red-600">
        {forbidden ? t("forbidden") : t("loadFailed")}
        {!forbidden && (
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

/**
 * Performance metrics from GET /api/v1/charts (the Dashboard's endpoint, other
 * charts). The month picker drives the KPI cards; the weekly trend, region and
 * category charts use the service's own windows.
 */
export function AnalyticsReportingPage() {
  const locale = useLocale();
  const [maxMonth] = useState(currentMonth);
  const [month, setMonth] = useState(maxMonth);
  const state = useAnalyticsReport(month, locale);
  const bodyRef = useRef<HTMLDivElement>(null);

  // The Retry button of a failed page is replaced by the loading state; move focus to
  // the body (which stays mounted) so a keyboard user is not dropped back on <body>.
  const retryFromFailure = () => {
    bodyRef.current?.focus();
    state.retry();
  };

  return (
    <div className="flex flex-col gap-6 font-sans pb-2">
      <TopHeader month={month} maxMonth={maxMonth} onMonthChange={setMonth} />

      <div ref={bodyRef} tabIndex={-1} className="flex flex-col gap-6 outline-none">
        {state.status === "ready" && <AnalyticsSections report={state.report} onRetry={state.retry} />}
        {state.status === "loading" && <AnalyticsSkeleton />}
        {state.status === "error" && (
          <AnalyticsFailed forbidden={state.error === "forbidden"} onRetry={retryFromFailure} />
        )}
      </div>
    </div>
  );
}

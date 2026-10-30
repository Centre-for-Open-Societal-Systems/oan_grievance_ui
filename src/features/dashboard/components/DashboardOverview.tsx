"use client";

import { useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAdminLevels, type UseAdminLevelsResult } from "../hooks/useAdminLevels";
import {
  useDashboardStatistics,
  type DashboardState,
} from "../hooks/useDashboardStatistics";
import type { DashboardStatistics } from "../types";
import { AdminLevelCard } from "./AdminLevelCard";
import { CARD_WHITE } from "./cardStyles";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { EscalationBanner, type EscalationBannerProps } from "./EscalationBanner";
import { KpiCards } from "./KpiCards";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { SectionUnavailable } from "./SectionUnavailable";
import { ServiceCategoryChart } from "./ServiceCategoryChart";
import { StatusDistributionChart } from "./StatusDistributionChart";
import { TopHeader } from "./TopHeader";

interface DashboardOverviewProps {
  /** The live list of recent grievances. It reads its own data, so it is placed here rather than built here. */
  recentGrievances: ReactNode;
}

/** What the escalation banner should say for this state, or null when the page shows its own error. */
function escalationBannerFor(state: DashboardState): EscalationBannerProps | null {
  switch (state.status) {
    case "loading":
      return { status: "loading" };
    case "error":
      return null;
    case "ready":
      return state.statistics.escalated === null
        ? { status: "unavailable" }
        : { status: "count", count: state.statistics.escalated };
  }
}

interface SectionsProps {
  statistics: DashboardStatistics;
  recentGrievances: ReactNode;
  isRefreshing: boolean;
  onRetry: () => void;
  levels: UseAdminLevelsResult;
  region: string | null;
  onSelectRegion: (code: string | null) => void;
}

/** The statistics that loaded. A chart that did not stands in as an unavailable section, in the same place. */
function DashboardSections({
  statistics,
  recentGrievances,
  isRefreshing,
  onRetry,
  levels,
  region,
  onSelectRegion,
}: SectionsProps) {
  const { kpis, monthlyTrend, statusDistribution, serviceCategories } = statistics;
  const unavailable = (className = "") => (
    <SectionUnavailable onRetry={onRetry} isRetrying={isRefreshing} className={className} />
  );

  return (
    <>
      {kpis ? <KpiCards data={kpis} /> : unavailable("h-[140px]")}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {monthlyTrend ? <MonthlyTrendChart data={monthlyTrend} /> : unavailable("h-[400px]")}
        {statusDistribution ? <StatusDistributionChart data={statusDistribution} /> : unavailable("h-[400px]")}
      </div>

      <AdminLevelCard levels={levels} selectedRegion={region} onSelectRegion={onSelectRegion} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {serviceCategories ? <ServiceCategoryChart data={serviceCategories} /> : unavailable("h-[320px]")}
        {recentGrievances}
      </div>
    </>
  );
}

/** Nothing could be loaded at all: say why, and offer a retry unless the caller is simply not allowed. */
function DashboardFailed({ forbidden, onRetry }: { forbidden: boolean; onRetry: () => void }) {
  const t = useTranslations("dashboard.overview");

  return (
    <div className={`${CARD_WHITE} p-6`}>
      <p role="alert" className="text-sm text-red-600">
        {forbidden ? t("forbidden") : t("loadFailed")}
        {!forbidden && (
          <>
            {" "}
            <button type="button" onClick={onRetry} className="underline font-semibold rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]">
              {t("retry")}
            </button>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * The dashboard's statistics, read from GET /api/v1/charts in one request.
 * Recent Grievances reads its own list, so it still renders when the statistics fail.
 */
export function DashboardOverview({ recentGrievances }: DashboardOverviewProps) {
  const locale = useLocale();
  const [region, setRegion] = useState<string | null>(null);
  const state = useDashboardStatistics(locale, region);
  const levels = useAdminLevels();
  const bodyRef = useRef<HTMLDivElement>(null);
  const banner = escalationBannerFor(state);

  // The Retry button of a failed page is replaced by the loading state; move focus to
  // the body (which stays mounted) so a keyboard user is not dropped back on <body>.
  // The failed page hides the level card, so a picked region could not be cleared: retry for all of them.
  const retryFromFailure = () => {
    bodyRef.current?.focus();
    setRegion(null);
    state.retry();
  };

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-4">
        <TopHeader />
        {banner && <EscalationBanner {...banner} />}
      </div>

      <div ref={bodyRef} tabIndex={-1} className="space-y-6 outline-none">
        {state.status === "ready" && (
          <DashboardSections
            statistics={state.statistics}
            recentGrievances={recentGrievances}
            isRefreshing={state.isRefreshing}
            onRetry={state.retry}
            levels={levels}
            region={region}
            onSelectRegion={setRegion}
          />
        )}
        {state.status === "loading" && <DashboardSkeleton recentGrievances={recentGrievances} />}
        {state.status === "error" && (
          <>
            <DashboardFailed forbidden={state.error === "forbidden"} onRetry={retryFromFailure} />
            {recentGrievances}
          </>
        )}
      </div>
    </div>
  );
}

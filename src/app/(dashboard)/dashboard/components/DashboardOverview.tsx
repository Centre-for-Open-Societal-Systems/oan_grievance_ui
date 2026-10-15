"use client";

import { useLocale, useTranslations } from "next-intl";
import { useDashboardStatistics } from "@/features/dashboard/hooks/useDashboardStatistics";
import { TopHeader } from "./TopHeader";
import { KpiCards } from "./KpiCards";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { StatusDistributionChart } from "./StatusDistributionChart";
import { ServiceCategoryChart } from "./ServiceCategoryChart";
import { RecentGrievances } from "./RecentGrievances";

/**
 * The dashboard's statistics, read from GET /api/v1/charts in one request.
 * Recent Grievances reads its own list, so it still renders when the statistics fail.
 */
export function DashboardOverview() {
  const t = useTranslations("dashboard.overview");
  const locale = useLocale();
  const { statistics, isLoading, error, retry } = useDashboardStatistics(locale);

  return (
    <div className="space-y-6 w-full">
      <TopHeader escalated={statistics?.escalated ?? 0} />

      {statistics ? (
        <>
          <KpiCards data={statistics.kpis} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MonthlyTrendChart data={statistics.monthlyTrend} />
            <StatusDistributionChart data={statistics.statusDistribution} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ServiceCategoryChart data={statistics.serviceCategories} />
            <RecentGrievances />
          </div>
        </>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-[#F1F3F4] p-6">
            {isLoading ? (
              <p role="status" className="text-sm text-gray-500">{t("loading")}</p>
            ) : (
              <p role="alert" className="text-sm text-red-600">
                {error === "forbidden" ? t("forbidden") : t("loadFailed")}
                {error !== "forbidden" && (
                  <>
                    {" "}
                    <button type="button" onClick={retry} className="underline font-semibold">{t("retry")}</button>
                  </>
                )}
              </p>
            )}
          </div>
          <RecentGrievances />
        </>
      )}
    </div>
  );
}

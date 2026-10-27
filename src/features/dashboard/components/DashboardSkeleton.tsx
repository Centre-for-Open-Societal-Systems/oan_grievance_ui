"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

const BLOCK = "animate-pulse rounded-xl bg-gray-100";

/**
 * The dashboard's shape while the statistics load, so the page does not jump when
 * they arrive. `recentGrievances` is live already and takes its usual place.
 */
export function DashboardSkeleton({ recentGrievances }: { recentGrievances: ReactNode }) {
  const t = useTranslations("dashboard.overview");

  return (
    <>
      <div role="status" aria-busy="true" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <span className="sr-only">{t("loading")}</span>
        {["total", "awaiting", "resolved", "escalated"].map((id) => (
          <div key={id} aria-hidden="true" className={`${BLOCK} h-[140px]`} />
        ))}
      </div>

      <div aria-hidden="true" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${BLOCK} h-[400px]`} />
        <div className={`${BLOCK} h-[400px]`} />
      </div>

      <div aria-hidden="true" className={`${BLOCK} h-[280px]`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div aria-hidden="true" className={`${BLOCK} h-[320px]`} />
        {recentGrievances}
      </div>
    </>
  );
}

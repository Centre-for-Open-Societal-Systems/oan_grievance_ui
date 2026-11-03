"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { SKELETON_CHART_HEIGHT, SKELETON_KPI_HEIGHT } from "./chartTheme";

const BLOCK = "animate-pulse motion-reduce:animate-none rounded-xl bg-gray-200";

/** The page's shape while the charts load, so it does not jump when they arrive. */
export function AnalyticsSkeleton(): ReactElement {
  const t = useTranslations("analytics");

  return (
    <>
      <div role="status" aria-busy="true" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <span className="sr-only">{t("loading")}</span>
        {["time", "rate", "escalation", "satisfaction"].map((id) => (
          <div key={id} aria-hidden="true" className={`${BLOCK} ${SKELETON_KPI_HEIGHT}`} />
        ))}
      </div>

      <div aria-hidden="true" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {["weekly", "region", "category", "avg"].map((id) => (
          <div key={id} className={`${BLOCK} ${SKELETON_CHART_HEIGHT}`} />
        ))}
        <div className={`${BLOCK} ${SKELETON_CHART_HEIGHT} lg:col-span-2`} />
      </div>
    </>
  );
}

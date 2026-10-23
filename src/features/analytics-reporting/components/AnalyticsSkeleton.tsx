"use client";

import { useTranslations } from "next-intl";

const BLOCK = "animate-pulse rounded-xl bg-gray-200";

/** The page's shape while the charts load, so it does not jump when they arrive. */
export function AnalyticsSkeleton() {
  const t = useTranslations("analytics");

  return (
    <>
      <div role="status" aria-busy="true" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <span className="sr-only">{t("loading")}</span>
        {["time", "rate", "escalation", "satisfaction"].map((id) => (
          <div key={id} aria-hidden="true" className={`${BLOCK} h-[130px]`} />
        ))}
      </div>

      <div aria-hidden="true" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${BLOCK} h-[460px]`} />
        <div className={`${BLOCK} h-[460px]`} />
        <div className={`${BLOCK} h-[460px]`} />
        <div className={`${BLOCK} h-[460px]`} />
        <div className={`${BLOCK} h-[460px] lg:col-span-2`} />
      </div>
    </>
  );
}

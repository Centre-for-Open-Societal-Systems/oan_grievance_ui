"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CARD_BASE, CARD_HOVER } from "./cardStyles";

export type EscalationBannerProps =
  | { status: "loading" }
  /** The escalated count could not be read, which is not the same as there being none. */
  | { status: "unavailable" }
  | { status: "count"; count: number };

/** Open escalated cases needing a senior officer. Absent only when the count is known to be zero. */
export function EscalationBanner(props: EscalationBannerProps) {
  const t = useTranslations("dashboard.overview");

  if (props.status === "loading") {
    return <div aria-hidden="true" className="h-[52px] animate-pulse rounded-xl bg-gray-100" />;
  }

  if (props.status === "unavailable") {
    return (
      <div role="alert" className={`${CARD_BASE} flex items-center gap-3 bg-gray-50 px-5 py-3.5 text-sm text-gray-700`}>
        <AlertTriangle aria-hidden="true" className="h-[18px] w-[18px] shrink-0 stroke-[2.5] text-gray-500" />
        {t("escalatedUnavailable")}
      </div>
    );
  }

  if (props.count === 0) return null;

  return (
    <div className={`${CARD_BASE} ${CARD_HOVER} flex items-center justify-between bg-[#fffcf0] px-5 py-3.5 text-sm`}>
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-[#fef3c7] p-1.5">
          <AlertTriangle aria-hidden="true" className="h-[18px] w-[18px] stroke-[2.5] text-[#d97706]" />
        </div>
        <span className="text-[#92400e]">
          {t.rich("escalatedBanner", {
            count: props.count,
            strong: (chunks) => <span className="font-semibold text-[#b45309]">{chunks}</span>,
          })}
        </span>
      </div>
      <Link href="/all-grievances" className="flex items-center gap-1.5 font-bold text-[#d97706] transition-colors hover:text-[#b45309]">
        {t("viewAll")} <ArrowRight aria-hidden="true" className="h-4 w-4 stroke-[2.5]" />
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRecentGrievances } from "@/features/all-grievances/hooks/useRecentGrievances";
import { statusBadgeClass } from "@/features/all-grievances/utils/statusStyles";

/** The newest grievances the signed-in officer or admin may see, from the same list the All Grievances page reads. */
export function RecentGrievances() {
  const t = useTranslations("dashboard.recentGrievances");
  const { grievances, isLoading, error, retry } = useRecentGrievances();

  return (
    <div className="bg-white rounded-2xl flex flex-col border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between gap-4">
        <h3 className="text-[16px] font-semibold text-[#111827] tracking-tight">{t("title")}</h3>
        <Link href="/all-grievances" className="text-[13px] font-semibold text-[#16A34A] hover:underline">
          {t("viewAll")}
        </Link>
      </div>

      {/* Scrollable container for data items */}
      <div className="flex-1 overflow-y-auto max-h-[380px] px-6 py-4 [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A]:rounded-full">
        {isLoading ? (
          <p role="status" className="text-sm text-gray-500">{t("loading")}</p>
        ) : error ? (
          <p role="alert" className="text-sm text-red-600">
            {t("loadFailed")}{" "}
            <button type="button" onClick={retry} className="underline font-semibold">{t("retry")}</button>
          </p>
        ) : grievances.length === 0 ? (
          <p className="text-sm text-gray-500">{t("empty")}</p>
        ) : (
          <ul className="space-y-4 pr-2">
            {grievances.map((g, i) => (
              <li key={g.id} className={`pb-4 ${i !== grievances.length - 1 ? "border-b border-gray-100" : ""}`}>
                <div className="flex justify-between items-start gap-3 mb-1.5">
                  <span className="text-[12px] font-mono text-gray-500">{g.ticketId}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold tracking-wide shrink-0 ${statusBadgeClass(g.status)}`}>
                    {g.status}
                  </span>
                </div>
                <h4 className="text-[13.5px] font-bold text-[#111827] mb-1">{g.title}</h4>
                <p className="text-[12px] text-gray-400">
                  {[g.location, g.submittedAt].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

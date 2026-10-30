"use client";

import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { KpiCard, KpiMetric } from "../types";
import { CARD_HOVER, CARD_WHITE } from "./cardStyles";

const ICONS: Record<KpiMetric, React.ReactNode> = {
  total: <FileText className="w-8 h-8 text-blue-600 stroke-[2] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />,
  awaiting_action: <Clock className="w-8 h-8 text-amber-500 stroke-[2] transition-transform duration-500 ease-in-out group-hover:rotate-[180deg]" />,
  resolved: <CheckCircle2 className="w-8 h-8 text-emerald-500 stroke-[2] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />,
  escalated: <AlertTriangle className="w-8 h-8 text-purple-600 stroke-[2] transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1" />,
};

const BACKGROUNDS: Record<KpiMetric, string> = {
  total: "bg-blue-50",
  awaiting_action: "bg-amber-50",
  resolved: "bg-emerald-50",
  escalated: "bg-purple-50",
};

/**
 * What each delta means. The colour follows the meaning, not the sign: more
 * grievances than last month is neither good nor bad, new work arriving is
 * something to notice, and resolved cases are good news. A zero is never an
 * improvement, so it takes the neutral colour.
 */
const DELTAS: Partial<Record<KpiMetric, { caption: "fromLastMonth" | "newThisWeek" | "resolvedThisWeek"; tone: string }>> = {
  total: { caption: "fromLastMonth", tone: "text-slate-600" },
  awaiting_action: { caption: "newThisWeek", tone: "text-amber-600" },
  resolved: { caption: "resolvedThisWeek", tone: "text-emerald-600" },
};
const NEUTRAL_TONE = "text-slate-500";

function Delta({ card }: { card: KpiCard }) {
  const t = useTranslations("dashboard.overview");
  const format = useFormatter();

  if (card.type === "alert") {
    // A fixed note on what escalates a case, not a change in the number: no arrow, and not the good-news colour.
    return <span className="text-[13px] text-gray-600">{t("escalatedCaption")}</span>;
  }

  const delta = DELTAS[card.metric];
  if (card.trend === null || !delta) return null;

  const isPercent = card.type === "percentage";
  const amount = format.number(Math.abs(card.trend), { maximumFractionDigits: 1 });
  const text = `${card.trend > 0 ? "+" : card.trend < 0 ? "-" : ""}${amount}${isPercent ? "%" : ""}`;
  const tone = card.trend === 0 ? NEUTRAL_TONE : delta.tone;

  return (
    <>
      <span className={`text-[14px] font-bold tracking-tight ${tone}`}>
        {card.trend !== 0 && <span aria-hidden="true">{card.trend > 0 ? "↗" : "↘"} </span>}
        {text}
      </span>
      <span className="text-[13px] text-gray-600">{t(`kpi.${delta.caption}`)}</span>
    </>
  );
}

export function KpiCards({ data: kpis }: { data: KpiCard[] }) {
  const t = useTranslations("dashboard.overview");
  const format = useFormatter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((card) => (
        <div
          key={card.metric}
          className={`group ${CARD_WHITE} ${CARD_HOVER} p-6 flex flex-col justify-between h-[140px]`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[16px] font-semibold text-slate-500 mb-2">{t(`kpi.${card.metric}`)}</p>
              <h3 className="text-[32px] leading-none font-bold text-slate-800 tracking-tight">
                {card.value === null ? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">{t("unavailableValue")}</span>
                  </>
                ) : (
                  format.number(card.value)
                )}
              </h3>
            </div>
            <div className={`p-5 rounded-2xl transition-colors duration-300 ${BACKGROUNDS[card.metric]}`}>
              {ICONS[card.metric]}
            </div>
          </div>
          <div className="flex items-center gap-1.5">{card.value === null ? null : <Delta card={card} />}</div>
        </div>
      ))}
    </div>
  );
}

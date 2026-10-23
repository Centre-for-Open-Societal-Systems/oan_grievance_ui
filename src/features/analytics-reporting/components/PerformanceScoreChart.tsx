"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { useFormatter, useTranslations } from "next-intl";
import type { PerformanceScoreAxis } from "../types";

interface ChartRow {
  axis: PerformanceScoreAxis["axis"];
  label: string;
  /** What is drawn: a missing score is drawn at the centre and named "no data" beside the chart. */
  value: number;
  score: number | null;
  basis: number;
}

type Translate = ReturnType<typeof useTranslations<"analytics">>;

function renderTooltip({ active, payload }: TooltipContentProps, t: Translate, formatScore: (n: number) => string) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-white p-3 border border-[#F1F3F4] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[140px] z-50">
      <p className="text-gray-900 font-semibold text-[13px] mb-1.5">{row.label}</p>
      <p className="text-[13px] text-gray-900 font-bold">
        {row.score === null ? t("noScore") : formatScore(row.score)}
      </p>
      <p className="text-[12px] text-gray-500">{t("scoreBasis", { count: row.basis })}</p>
    </div>
  );
}

export function PerformanceScoreChart({ data }: { data: PerformanceScoreAxis[] }) {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const formatScore = (score: number) => format.number(score, { maximumFractionDigits: 1 });

  const rows = useMemo<ChartRow[]>(
    () =>
      data.map((row) => ({
        axis: row.axis,
        label: t(`axis.${row.axis}`),
        value: row.score ?? 0,
        score: row.score,
        basis: row.basis,
      })),
    [data, t]
  );

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] border border-[#F1F3F4] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">{t("performanceScore")}</h3>
      </div>
      <div className="p-6 pt-5 flex-1 w-full grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        <div aria-hidden="true" className="w-full h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={rows} outerRadius="70%">
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip content={(props) => renderTooltip(props, t, formatScore)} />
              <Radar
                dataKey="value"
                name={t("performanceScore")}
                stroke="#16a34a"
                strokeWidth={2}
                fill="#16a34a"
                fillOpacity={0.25}
                isAnimationActive={true}
                animationDuration={1200}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* The same scores as text: it is what a screen reader gets, and it says "no data" where the radar can only draw a point. */}
        <ul className="flex flex-col gap-2 min-w-[200px]">
          {rows.map((row) => (
            <li key={row.axis} className="flex items-baseline justify-between gap-6 text-[13px]">
              <span className="font-medium text-gray-600">{row.label}</span>
              <span className="font-bold text-gray-900">
                {row.score === null ? t("noScore") : formatScore(row.score)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

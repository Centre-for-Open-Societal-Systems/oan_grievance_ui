"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { useFormatter, useTranslations } from "next-intl";
import type { AvgResolutionStat } from "../types";

interface ChartRow extends AvgResolutionStat {
  /** The label on the axis: the category, or its "uncategorised" stand-in. */
  name: string;
}

type Translate = ReturnType<typeof useTranslations<"analytics">>;

function renderTooltip(
  { active, payload, label }: TooltipContentProps,
  t: Translate,
  formatDays: (days: number) => string
) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-white p-3 border border-[#F1F3F4] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[140px] z-50">
      <p className="text-gray-900 font-semibold text-[13px] mb-2 pb-2 border-b border-[#F1F3F4]">{label}</p>
      <div className="flex flex-col gap-1.5 text-[13px]">
        <span className="text-gray-900 font-bold">{t("avgDaysValue", { days: formatDays(row.days) })}</span>
        <span className="text-gray-500">{t("casesBehind", { count: row.resolved })}</span>
      </div>
    </div>
  );
}

export function AvgResolutionChart({ data }: { data: AvgResolutionStat[] }) {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const formatDays = (days: number) => format.number(days, { maximumFractionDigits: 1 });

  const rows = useMemo<ChartRow[]>(
    () => data.map((row) => ({ ...row, name: row.category ?? t("uncategorised") })),
    [data, t]
  );

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] border border-[#F1F3F4] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">{t("avgResolution")}</h3>
      </div>
      <div className="p-6 pt-5 flex-1 w-full min-h-[380px]">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 30, left: -20, bottom: 20 }}>
              <CartesianGrid vertical={true} horizontal={true} stroke="#F1F3F4" strokeDasharray="0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
                tickFormatter={(value: number) => t("daysTick", { days: formatDays(value) })}
                domain={[0, 'auto']}
                dx={-10}
              />
              <Tooltip content={(props) => renderTooltip(props, t, formatDays)} cursor={{ fill: '#f8fafc' }} />
              <Bar
                dataKey="days"
                name={t("avgResolutionSeries")}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                barSize={14}
                animationDuration={1200}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

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
  Legend,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { useTranslations } from "next-intl";
import type { CategoryResolutionStat } from "../types";

interface ChartRow extends CategoryResolutionStat {
  /** The label on the axis: the category, or its "uncategorised" stand-in. */
  name: string;
}

type Translate = ReturnType<typeof useTranslations<"analytics">>;

function renderTooltip({ active, payload, label }: TooltipContentProps, t: Translate) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  return (
    <div className="bg-white p-3 border border-[#F1F3F4] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[140px] z-50">
      <p className="text-gray-900 font-semibold text-[13px] mb-2 pb-2 border-b border-[#F1F3F4]">{label}</p>
      <div className="flex flex-col gap-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 text-[13px] font-medium">{entry.name}</span>
            </div>
            <span className="text-gray-900 font-bold text-[13px]">{entry.value}</span>
          </div>
        ))}
        {row && row.resolved > 0 && (
          <div className="mt-1 pt-2 border-t border-[#F1F3F4] flex flex-col gap-1 text-[12px] text-gray-500">
            <span>{t("resolvedOnTime", { count: row.resolvedOnTime })}</span>
            <span>{t("resolvedBreached", { count: row.resolvedBreached })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function VolumeServiceChart({ data }: { data: CategoryResolutionStat[] }) {
  const t = useTranslations("analytics");

  const rows = useMemo<ChartRow[]>(
    () => data.map((row) => ({ ...row, name: row.category ?? t("uncategorised") })),
    [data, t]
  );

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] border border-[#F1F3F4] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">{t("categoryVolume")}</h3>
      </div>
      <div className="p-6 pt-5 flex-1 w-full min-h-[380px]">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 30, left: -20, bottom: 20 }} barGap={2}>
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
                allowDecimals={false}
                domain={[0, 'auto']}
                dx={-10}
              />
              <Tooltip content={(props) => renderTooltip(props, t)}cursor={{ fill: '#f8fafc' }} />
              <Legend
                iconType="circle"
                wrapperStyle={{ bottom: '-10px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}
              />
              <Bar dataKey="filed" name={t("filed")} fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} animationDuration={1200} />
              <Bar dataKey="resolved" name={t("resolved")} fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

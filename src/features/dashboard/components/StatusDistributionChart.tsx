"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { useFormatter, useTranslations } from "next-intl";
import type { StatusDistributionSlice } from "../types";
import { normalizeStatus } from "../utils/mapDashboardCharts";

/** The workflow statuses this app has messages for, by normalised label. */
const STATUS_MESSAGE_KEYS: Record<string, string> = {
  submitted: "submitted",
  assigned: "assigned",
  "in progress": "inProgress",
  "more info needed": "moreInfoNeeded",
  resolved: "resolved",
  closed: "closed",
  rejected: "rejected",
};

export function StatusDistributionChart({ data }: { data: StatusDistributionSlice[] }) {
  const t = useTranslations("dashboard.overview");
  const format = useFormatter();
  // A status this app has no message for keeps the label the service sent.
  const statusLabel = (name: string): string => {
    const key = STATUS_MESSAGE_KEYS[normalizeStatus(name)];
    return key ? t(`statuses.${key}`) : name;
  };
  // The tooltip reads each slice's name, so it gets the same translated label as the legend.
  const slices = data.map((slice) => ({ ...slice, name: statusLabel(slice.name) }));
  const totalStatus = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white rounded-2xl flex flex-col h-[400px] border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-[16px] font-semibold text-[#111827] tracking-tight">{t("statusDistribution")}</h3>
      </div>

      {totalStatus === 0 ? (
        <p className="flex-1 flex items-center justify-center p-6 text-sm text-gray-500">{t("noStatuses")}</p>
      ) : (
      <div className="flex-1 flex flex-col items-center p-6 pt-4 pb-6 focus:outline-none">

        {/* Chart Area */}
        <div className="relative w-full flex-1 min-h-0 focus:outline-none">
          <ResponsiveContainer width="100%" height="100%" className="focus:outline-none" style={{ outline: 'none' }}>
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={slices}
                innerRadius={85}
                outerRadius={110}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
                style={{ outline: 'none' }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                itemStyle={{ fontSize: '12px', padding: '2px 0' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Perfectly Centered Text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[36px] font-bold text-gray-900 tracking-tight leading-none mb-1">{format.number(totalStatus)}</span>
            <span className="text-[16px] text-gray-500 font-medium">{t("statusTotal")}</span>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="w-full flex flex-wrap justify-center gap-x-4 gap-y-2.5 text-[12px] text-gray-500 font-medium px-2 leading-tight mt-6">
          {data.map((status, i) => (
            <div key={i} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }}></span>
              {statusLabel(status.name)}
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

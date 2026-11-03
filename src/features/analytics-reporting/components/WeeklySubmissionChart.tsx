"use client";

import type { ReactElement } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import type { WeeklyTrendPoint } from "../types";
import {
  ANIMATION_MS,
  AXIS_TICK,
  CHART_CARD,
  CHART_CARD_HEADER,
  CHART_CARD_TITLE,
  CHART_COLORS,
  CHART_MIN_HEIGHT,
  TOOLTIP_BOX,
  TOOLTIP_TITLE,
} from "./chartTheme";

function renderTooltip({ active, payload, label }: TooltipContentProps): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={TOOLTIP_BOX}>
      <p className={TOOLTIP_TITLE}>{label}</p>
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
      </div>
    </div>
  );
}

interface WeeklySubmissionChartProps {
  readonly data: readonly WeeklyTrendPoint[];
}

export function WeeklySubmissionChart({ data }: WeeklySubmissionChartProps): ReactElement {
  const t = useTranslations("analytics");
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={CHART_CARD}>
      <div className={CHART_CARD_HEADER}>
        <h3 className={CHART_CARD_TITLE}>{t("weeklyTrend")}</h3>
      </div>
      <div className={`p-6 pt-5 flex-1 w-full ${CHART_MIN_HEIGHT}`}>
        {data.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...data]} margin={{ top: 5, right: 40, left: -20, bottom: 20 }}>
              <CartesianGrid vertical={true} horizontal={true} stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ ...AXIS_TICK, fill: CHART_COLORS.axisTextSlate }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ ...AXIS_TICK, fill: CHART_COLORS.axisTextSlate }}
                allowDecimals={false}
                domain={[0, 'auto']}
                dx={-10}
              />
              <Tooltip
                content={renderTooltip}
                cursor={{ stroke: CHART_COLORS.cursorStroke, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ bottom: '-10px', fontSize: '13px', fontWeight: 500, color: CHART_COLORS.legendText }}
              />
              <Area
                type="monotone"
                dataKey="received"
                name={t("received")}
                stroke={CHART_COLORS.received}
                strokeWidth={3}
                fill={CHART_COLORS.receivedFill}
                fillOpacity={1}
                dot={{ r: 4, fill: CHART_COLORS.received, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={!reducedMotion}
                animationDuration={ANIMATION_MS.area}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name={t("resolved")}
                stroke={CHART_COLORS.resolved}
                strokeWidth={3}
                fill="none"
                dot={{ r: 4, fill: CHART_COLORS.resolved, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={!reducedMotion}
                animationDuration={ANIMATION_MS.area}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

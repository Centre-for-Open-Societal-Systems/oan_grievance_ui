"use client";

import { useMemo, type ReactElement } from "react";
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
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import type { CategoryResolutionStat } from "../types";
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

interface ChartRow extends CategoryResolutionStat {
  /** The label on the axis: the category, or its "uncategorised" stand-in. */
  readonly name: string;
}

type Translate = ReturnType<typeof useTranslations<"analytics">>;

function renderTooltip({ active, payload, label }: TooltipContentProps, t: Translate): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
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

interface VolumeServiceChartProps {
  readonly data: readonly CategoryResolutionStat[];
}

export function VolumeServiceChart({ data }: VolumeServiceChartProps): ReactElement {
  const t = useTranslations("analytics");
  const reducedMotion = usePrefersReducedMotion();

  const rows = useMemo<ChartRow[]>(
    () => data.map((row) => ({ ...row, name: row.category ?? t("uncategorised") })),
    [data, t]
  );

  return (
    <div className={CHART_CARD}>
      <div className={CHART_CARD_HEADER}>
        <h3 className={CHART_CARD_TITLE}>{t("categoryVolume")}</h3>
      </div>
      <div className={`p-6 pt-5 flex-1 w-full ${CHART_MIN_HEIGHT}`}>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 30, left: -20, bottom: 20 }} barGap={2}>
              <CartesianGrid vertical={true} horizontal={true} stroke={CHART_COLORS.grid} strokeDasharray="0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={15} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                allowDecimals={false}
                domain={[0, 'auto']}
                dx={-10}
              />
              <Tooltip content={(props) => renderTooltip(props, t)} cursor={{ fill: CHART_COLORS.cursorFill }} />
              <Legend
                iconType="circle"
                wrapperStyle={{ bottom: '-10px', fontSize: '13px', fontWeight: 500, color: CHART_COLORS.axisText }}
              />
              <Bar
                dataKey="filed"
                name={t("filed")}
                fill={CHART_COLORS.received}
                radius={[4, 4, 0, 0]}
                barSize={14}
                isAnimationActive={!reducedMotion}
                animationDuration={ANIMATION_MS.bars}
              />
              <Bar
                dataKey="resolved"
                name={t("resolved")}
                fill={CHART_COLORS.resolved}
                radius={[4, 4, 0, 0]}
                barSize={14}
                isAnimationActive={!reducedMotion}
                animationDuration={ANIMATION_MS.bars}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

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
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { useFormatter, useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import type { AvgResolutionStat } from "../types";
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

interface ChartRow extends AvgResolutionStat {
  /** The label on the axis: the category, or its "uncategorised" stand-in. */
  readonly name: string;
}

type Translate = ReturnType<typeof useTranslations<"analytics">>;

function renderTooltip(
  { active, payload, label }: TooltipContentProps,
  t: Translate,
  formatDays: (days: number) => string
): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  return (
    <div className={TOOLTIP_BOX}>
      <p className={TOOLTIP_TITLE}>{label}</p>
      <div className="flex flex-col gap-1.5 text-[13px]">
        <span className="text-gray-900 font-bold">{t("avgDaysValue", { days: formatDays(row.days) })}</span>
        <span className="text-gray-500">{t("casesBehind", { count: row.resolved })}</span>
      </div>
    </div>
  );
}

interface AvgResolutionChartProps {
  readonly data: readonly AvgResolutionStat[];
}

export function AvgResolutionChart({ data }: AvgResolutionChartProps): ReactElement {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const reducedMotion = usePrefersReducedMotion();
  const formatDays = (days: number): string => format.number(days, { maximumFractionDigits: 1 });

  const rows = useMemo<ChartRow[]>(
    () => data.map((row) => ({ ...row, name: row.category ?? t("uncategorised") })),
    [data, t]
  );

  return (
    <div className={CHART_CARD}>
      <div className={CHART_CARD_HEADER}>
        <h3 className={CHART_CARD_TITLE}>{t("avgResolution")}</h3>
      </div>
      <div className={`p-6 pt-5 flex-1 w-full ${CHART_MIN_HEIGHT}`}>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 30, left: -20, bottom: 20 }}>
              <CartesianGrid vertical={true} horizontal={true} stroke={CHART_COLORS.grid} strokeDasharray="0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={15} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                tickFormatter={(value: number) => t("daysTick", { days: formatDays(value) })}
                domain={[0, 'auto']}
                dx={-10}
              />
              <Tooltip
                content={(props) => renderTooltip(props, t, formatDays)}
                cursor={{ fill: CHART_COLORS.cursorFill }}
              />
              <Bar
                dataKey="days"
                name={t("avgResolutionSeries")}
                fill={CHART_COLORS.received}
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

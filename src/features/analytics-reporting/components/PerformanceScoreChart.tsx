"use client";

import { useMemo, type ReactElement } from "react";
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
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import type { PerformanceScoreAxis } from "../types";
import {
  ANIMATION_MS,
  CHART_CARD,
  CHART_CARD_HEADER,
  CHART_CARD_TITLE,
  CHART_COLORS,
  CHART_HEIGHT,
  TOOLTIP_BOX,
} from "./chartTheme";

interface ChartRow {
  readonly axis: PerformanceScoreAxis["axis"];
  readonly label: string;
  /** What is drawn: a missing score is drawn at the centre and named "no data" beside the chart. */
  readonly value: number;
  readonly score: number | null;
  readonly basis: number;
}

type Translate = ReturnType<typeof useTranslations<"analytics">>;

function renderTooltip(
  { active, payload }: TooltipContentProps,
  t: Translate,
  formatScore: (score: number) => string
): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  return (
    <div className={TOOLTIP_BOX}>
      <p className="text-gray-900 font-semibold text-[13px] mb-1.5">{row.label}</p>
      <p className="text-[13px] text-gray-900 font-bold">
        {row.score === null ? t("noScore") : formatScore(row.score)}
      </p>
      <p className="text-[12px] text-gray-500">{t("scoreBasis", { count: row.basis })}</p>
    </div>
  );
}

interface PerformanceScoreChartProps {
  readonly data: readonly PerformanceScoreAxis[];
}

export function PerformanceScoreChart({ data }: PerformanceScoreChartProps): ReactElement {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const reducedMotion = usePrefersReducedMotion();
  const formatScore = (score: number): string => format.number(score, { maximumFractionDigits: 1 });

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
    <div className={CHART_CARD}>
      <div className={CHART_CARD_HEADER}>
        <h3 className={CHART_CARD_TITLE}>{t("performanceScore")}</h3>
      </div>
      <div className="p-6 pt-5 flex-1 w-full grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        <div aria-hidden="true" className={`w-full ${CHART_HEIGHT}`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={rows} outerRadius="70%">
              <PolarGrid stroke={CHART_COLORS.polarGrid} />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: CHART_COLORS.axisText, fontWeight: 500 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip content={(props) => renderTooltip(props, t, formatScore)} />
              <Radar
                dataKey="value"
                name={t("performanceScore")}
                stroke={CHART_COLORS.resolvedStroke}
                strokeWidth={2}
                fill={CHART_COLORS.resolvedStroke}
                fillOpacity={0.25}
                isAnimationActive={!reducedMotion}
                animationDuration={ANIMATION_MS.bars}
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

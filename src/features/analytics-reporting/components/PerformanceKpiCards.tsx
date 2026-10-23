"use client";

import type { ElementType, ReactElement } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { DeltaTone, PerformanceKpi, PerformanceMetric } from "../types";
import { CheckCircleIcon, StarIcon, TimerIcon, TrendDotsIcon } from "./KPIIcons";
import { KPICard } from "./KPICard";

const TONE_COLORS: Record<DeltaTone, string> = {
  good: "#16a34a",
  bad: "#ef4444",
  neutral: "#6B7280",
};

const CARD_LOOK: Record<PerformanceMetric, { Icon: ElementType; iconColor: string; iconBgColor: string }> = {
  avg_resolution_time: { Icon: TimerIcon, iconColor: "#3b82f6", iconBgColor: "#eff6ff" },
  resolution_rate: { Icon: CheckCircleIcon, iconColor: "#16a34a", iconBgColor: "#f0fdf4" },
  escalation_rate: { Icon: TrendDotsIcon, iconColor: "#f97316", iconBgColor: "#fff7ed" },
  satisfaction: { Icon: StarIcon, iconColor: "#facc14", iconBgColor: "#fefce8" },
};

interface PerformanceKpiCardsProps {
  readonly data: readonly PerformanceKpi[];
}

export function PerformanceKpiCards({ data }: PerformanceKpiCardsProps): ReactElement {
  const t = useTranslations("analytics.kpi");
  const format = useFormatter();

  const number = (value: number): string => format.number(value, { maximumFractionDigits: 1 });
  const signed = (value: number): string =>
    format.number(value, { maximumFractionDigits: 1, signDisplay: "exceptZero" });

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.map((kpi) => {
        const look = CARD_LOOK[kpi.metric];

        // The unit comes from the service. Percent and days are known; any other is shown as sent
        // (a rating out of 5 is not a percentage just because most metrics here are).
        const isPercent = kpi.unit === "percent";
        const isDays = kpi.unit === "days";

        let value = t("unavailableValue");
        if (kpi.value !== null) value = isPercent ? `${number(kpi.value)}%` : number(kpi.value);

        let subtitle: string | undefined;
        if (kpi.delta !== null) {
          if (isDays) subtitle = t("deltaDays", { delta: signed(kpi.delta) });
          else if (isPercent) subtitle = t("deltaPercent", { delta: signed(kpi.delta) });
          else subtitle = t("deltaOther", { delta: signed(kpi.delta), unit: kpi.unit });
        } else if (kpi.metric === "satisfaction" && kpi.value !== null && kpi.basis !== null) {
          subtitle = t("basedOn", { count: kpi.basis });
        }

        let unitLabel: string | undefined;
        if (kpi.value !== null && !isPercent) unitLabel = isDays ? t("days") : kpi.unit;

        return (
          <li key={kpi.metric}>
            <KPICard
              title={t(kpi.metric)}
              value={value}
              unit={unitLabel}
              subtitle={subtitle}
              subtitleColor={TONE_COLORS[kpi.tone]}
              iconBgColor={look.iconBgColor}
              Icon={look.Icon}
              iconColor={look.iconColor}
            />
          </li>
        );
      })}
    </ul>
  );
}

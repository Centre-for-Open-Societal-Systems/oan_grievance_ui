"use client";

import type { ElementType } from "react";
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

export function PerformanceKpiCards({ data }: { data: PerformanceKpi[] }) {
  const t = useTranslations("analytics.kpi");
  const format = useFormatter();

  const number = (value: number) => format.number(value, { maximumFractionDigits: 1 });
  const signed = (value: number) => format.number(value, { maximumFractionDigits: 1, signDisplay: "exceptZero" });

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.map((kpi) => {
        const look = CARD_LOOK[kpi.metric];

        let value = t("unavailableValue");
        if (kpi.value !== null) value = kpi.unit === "percent" ? `${number(kpi.value)}%` : number(kpi.value);

        let subtitle: string | undefined;
        if (kpi.delta !== null) {
          subtitle = t(kpi.unit === "days" ? "deltaDays" : "deltaPercent", { delta: signed(kpi.delta) });
        } else if (kpi.metric === "satisfaction" && kpi.value !== null && kpi.basis !== null) {
          subtitle = t("basedOn", { count: kpi.basis });
        }

        return (
          <li key={kpi.metric}>
            <KPICard
              title={t(kpi.metric)}
              value={value}
              unit={kpi.value !== null && kpi.unit === "days" ? t("days") : undefined}
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

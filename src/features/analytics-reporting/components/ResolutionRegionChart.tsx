"use client";

import { useState, useEffect, type ReactElement } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import type { RegionResolutionStat } from "../types";
import { CHART_CARD, CHART_CARD_HEADER, CHART_CARD_TITLE, CHART_COLORS, CHART_MIN_HEIGHT } from "./chartTheme";

/** The vertical guides and the scale under the bars, as percentages of the track. */
const SCALE_STOPS = [0, 25, 50, 75, 100] as const;

interface ResolutionRegionChartProps {
  readonly data: readonly RegionResolutionStat[];
}

export function ResolutionRegionChart({ data }: ResolutionRegionChartProps): ReactElement {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const reducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const percent = (value: number): string => `${format.number(value, { maximumFractionDigits: 1 })}%`;
  // The bars grow in from nothing, unless the viewer asked for less motion: then they start at their size.
  const drawn = mounted || reducedMotion;

  return (
    <div className={CHART_CARD}>
      <div className={`${CHART_CARD_HEADER} flex items-center justify-between gap-3`}>
        <h3 className={CHART_CARD_TITLE}>{t("regionResolution")}</h3>
        {/* The service gives every case to date, whatever month is picked. */}
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
          {t("allTime")}
        </span>
      </div>
      {data.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">{t("noData")}</p>
      ) : (
        <div className={`p-6 pt-5 flex-1 flex flex-col relative ${CHART_MIN_HEIGHT}`}>
          {/* Table Grid Background */}
          <div aria-hidden="true" className="absolute left-6 right-6 top-5 bottom-10 pointer-events-none">
            <div className="w-full h-full relative">
              {SCALE_STOPS.map((stop) => (
                <div key={stop} className="absolute top-0 bottom-0 border-l border-[#F1F3F4]" style={{ left: `${stop}%` }} />
              ))}
            </div>
          </div>

          <ul className="relative z-10 flex-1 flex flex-col gap-3">
            {data.map((item) => (
              <li key={item.code} className="flex-1 flex flex-col justify-center border-b border-[#F1F3F4] group relative">
                <div className="flex justify-between items-center mb-0.5 px-0.5">
                  <span className="text-[12.5px] font-bold text-[#334155]">{item.name}</span>
                  <span className="text-[12.5px] font-bold text-gray-900">{percent(item.rate)}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={item.name}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.rate}
                  aria-valuetext={t("regionTooltip", { resolved: item.resolved, total: item.total })}
                  className="w-full h-2 bg-[#f8fafc] rounded-full overflow-hidden relative z-10"
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none group-hover:brightness-110"
                    style={{ width: drawn ? `${item.rate}%` : "0%", backgroundColor: CHART_COLORS.resolved }}
                  ></div>
                </div>

                {/* Tooltip */}
                <div aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 -top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 motion-reduce:transition-none pointer-events-none z-50">
                  <div className="bg-white p-2.5 border border-[#F1F3F4] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS.resolved }} />
                      <span className="text-gray-600 text-[13px] font-medium">{item.name}</span>
                    </div>
                    <span className="text-gray-900 font-bold text-[13px]">
                      {t("regionTooltip", { resolved: item.resolved, total: item.total })}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* X-axis labels for bar chart */}
          <div aria-hidden="true" className="relative pt-3 h-6 z-10 w-full mt-1">
            {SCALE_STOPS.map((stop) => (
              <span
                key={stop}
                className={`absolute text-[11px] font-semibold text-[#6B7280] ${
                  stop === 0 ? "" : stop === 100 ? "-translate-x-full" : "-translate-x-1/2"
                }`}
                style={{ left: `${stop}%` }}
              >
                {stop}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
